import { and, asc, desc, eq, getTableColumns, isNull } from "drizzle-orm";
import {
  users,
  workspaceMemberships,
  workspaces,
  type WorkspaceMembershipRow,
  type WorkspaceRow,
} from "./schema";
import { withTransaction, type PostgresClient, type PostgresTransaction } from "./client";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface CreateWorkspaceInput {
  name: string;
  color: string;
  icon: string;
  createdBy: string; // userId del creador → Owner
}

/** Workspace + el rol del usuario que consulta (para listado/detalle). */
export interface WorkspaceWithRole extends WorkspaceRow {
  role: string;
}

/** Fila de la vista de miembros (membership + datos del usuario). */
export interface WorkspaceMemberRow {
  userId: string;
  email: string;
  name: string | null;
  picture: string | null;
  role: string;
  createdAt: Date;
}

/** La mutación dejaría el workspace sin Owner (viola BR-5). */
export class LastOwnerError extends Error {
  constructor() {
    super("El workspace debe conservar al menos un Owner");
    this.name = "LastOwnerError";
  }
}

/** El usuario objetivo no es miembro del workspace. */
export class MembershipNotFoundError extends Error {
  constructor() {
    super("El usuario no es miembro del workspace");
    this.name = "MembershipNotFoundError";
  }
}

/**
 * Invariante "siempre ≥1 Owner" (BR-5), como decisión PURA (testeable sin DB).
 * Lanza `LastOwnerError` si una operación que REMUEVE un owner dejaría el workspace
 * sin owners.
 *
 * @param ownerCount      owners actuales (contados bajo lock dentro de la transacción)
 * @param removesAnOwner  ¿la operación elimina/degrada a un owner?
 */
export function assertKeepsAnOwner(ownerCount: number, removesAnOwner: boolean): void {
  if (removesAnOwner && ownerCount <= 1) throw new LastOwnerError();
}

export class WorkspacesRepository {
  constructor(private readonly db: PostgresClient) {}

  /**
   * Crea workspace + membership Owner del creador en UNA transacción (BR-2).
   * Requiere runtime con transacciones (ECS/pg). En Lambda `withTransaction` lanza.
   */
  async createWithOwner(input: CreateWorkspaceInput): Promise<WorkspaceRow> {
    return withTransaction(this.db, async (tx) => {
      const [ws] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          color: input.color,
          icon: input.icon,
          createdBy: input.createdBy,
        })
        .returning();
      await tx.insert(workspaceMemberships).values({
        workspaceId: ws.id,
        userId: input.createdBy,
        role: "owner",
      });
      return ws;
    });
  }

  /** Workspaces ACTIVOS donde el usuario tiene membership, con su rol (BR-10, BR-8). */
  async listForUser(userId: string): Promise<WorkspaceWithRole[]> {
    return this.db
      .select({ ...getTableColumns(workspaces), role: workspaceMemberships.role })
      .from(workspaces)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(and(eq(workspaceMemberships.userId, userId), isNull(workspaces.archivedAt)))
      .orderBy(desc(workspaces.createdAt));
  }

  /**
   * Workspace por id SOLO si el usuario es miembro; si no, `null` (el guard lo
   * traduce a 404, sin filtrar existencia). Usado por `WorkspaceMemberGuard` y GET /:id.
   */
  async findByIdForUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithRole | null> {
    const rows = await this.db
      .select({ ...getTableColumns(workspaces), role: workspaceMemberships.role })
      .from(workspaces)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(and(eq(workspaces.id, workspaceId), eq(workspaceMemberships.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateBranding(
    workspaceId: string,
    patch: { name?: string; color?: string; icon?: string },
  ): Promise<WorkspaceRow> {
    const set: Partial<Pick<WorkspaceRow, "name" | "color" | "icon">> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.color !== undefined) set.color = patch.color;
    if (patch.icon !== undefined) set.icon = patch.icon;

    const [row] = await this.db
      .update(workspaces)
      .set(set)
      .where(eq(workspaces.id, workspaceId))
      .returning();
    return row;
  }

  /** Soft-delete: marca `archivedAt` (BR-8). La fila y las memberships persisten. */
  async archive(workspaceId: string): Promise<WorkspaceRow> {
    const now = new Date();
    const [row] = await this.db
      .update(workspaces)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(workspaces.id, workspaceId))
      .returning();
    return row;
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    return this.db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        picture: users.picture,
        role: workspaceMemberships.role,
        createdAt: workspaceMemberships.createdAt,
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(eq(workspaceMemberships.workspaceId, workspaceId))
      .orderBy(asc(workspaceMemberships.createdAt));
  }

  /**
   * Inserta una membership directa. Duplicado (mismo user en el workspace) viola el
   * unique `(workspace_id, user_id)` → 23505 → 409 (vía `AllExceptionsFilter`).
   */
  async addMemberByUserId(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = "member",
  ): Promise<WorkspaceMembershipRow> {
    const [row] = await this.db
      .insert(workspaceMemberships)
      .values({ workspaceId, userId, role })
      .returning();
    return row;
  }

  /** Remueve a un miembro. Protege BR-5 si el objetivo es owner. */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await withTransaction(this.db, async (tx) => {
      const ownerIds = await this.lockOwners(tx, workspaceId);
      const target = await this.readMembership(tx, workspaceId, userId);
      if (!target) throw new MembershipNotFoundError();
      assertKeepsAnOwner(ownerIds.length, target.role === "owner");
      await tx
        .delete(workspaceMemberships)
        .where(
          and(
            eq(workspaceMemberships.workspaceId, workspaceId),
            eq(workspaceMemberships.userId, userId),
          ),
        );
    });
  }

  /** Auto-salida = remover la propia membership (BR-7), con la misma guarda BR-5. */
  async leave(workspaceId: string, userId: string): Promise<void> {
    return this.removeMember(workspaceId, userId);
  }

  /** Cambia el rol de un miembro. Degradar al último owner viola BR-5. */
  async changeRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole,
  ): Promise<WorkspaceMembershipRow> {
    return withTransaction(this.db, async (tx) => {
      const ownerIds = await this.lockOwners(tx, workspaceId);
      const target = await this.readMembership(tx, workspaceId, userId);
      if (!target) throw new MembershipNotFoundError();
      const removesAnOwner = target.role === "owner" && newRole !== "owner";
      assertKeepsAnOwner(ownerIds.length, removesAnOwner);
      const [row] = await tx
        .update(workspaceMemberships)
        .set({ role: newRole })
        .where(
          and(
            eq(workspaceMemberships.workspaceId, workspaceId),
            eq(workspaceMemberships.userId, userId),
          ),
        )
        .returning();
      return row;
    });
  }

  /**
   * Bloquea (FOR UPDATE) las filas owner del workspace, en orden determinístico por
   * `userId`. El orden fijo evita deadlocks entre mutaciones concurrentes, y el lock
   * serializa las operaciones que afectan el conteo de owners → BR-5 a prueba de carreras.
   */
  private async lockOwners(tx: PostgresTransaction, workspaceId: string): Promise<string[]> {
    const rows = await tx
      .select({ userId: workspaceMemberships.userId })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.role, "owner"),
        ),
      )
      .orderBy(asc(workspaceMemberships.userId))
      .for("update");
    return rows.map((r) => r.userId);
  }

  private async readMembership(
    tx: PostgresTransaction,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembershipRow | null> {
    const rows = await tx
      .select()
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
