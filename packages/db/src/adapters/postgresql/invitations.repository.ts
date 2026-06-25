import { and, desc, eq } from "drizzle-orm";
import { invitations, workspaceMemberships, workspaces, type InvitationRow } from "./schema";
import { withTransaction, type PostgresClient } from "./client";

/** Invitación + branding del workspace (para el preview de la pantalla de aceptar). */
export interface InvitationWithWorkspace extends InvitationRow {
  workspaceName: string;
  workspaceColor: string;
  workspaceIcon: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked";
export type InvitationRole = "admin" | "member" | "viewer";

export interface CreateInvitationInput {
  workspaceId: string;
  email: string;
  role: InvitationRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}

/** La invitación no existe (token inválido). */
export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitación no encontrada");
    this.name = "InvitationNotFoundError";
  }
}
/** La invitación ya fue aceptada o revocada (no está pendiente). */
export class InvitationNotPendingError extends Error {
  constructor() {
    super("La invitación ya no está disponible");
    this.name = "InvitationNotPendingError";
  }
}
/** La invitación expiró. */
export class InvitationExpiredError extends Error {
  constructor() {
    super("La invitación expiró");
    this.name = "InvitationExpiredError";
  }
}
/** El email de la invitación no coincide con el del usuario autenticado. */
export class InvitationEmailMismatchError extends Error {
  constructor() {
    super("La invitación es para otro email");
    this.name = "InvitationEmailMismatchError";
  }
}

/**
 * Acceso a invitaciones (M3). Scoped por workspace en gestión; el token es global pero
 * se valida contra estado/expiración. `accept` es transaccional (relee FOR UPDATE,
 * inserta membership, marca accepted) para evitar doble aceptación.
 */
export class InvitationsRepository {
  constructor(private readonly db: PostgresClient) {}

  /** Crea una invitación pendiente. Duplicado pending (mismo ws+email) → 23505 → 409 (BR-6). */
  async create(input: CreateInvitationInput): Promise<InvitationRow> {
    const [row] = await this.db
      .insert(invitations)
      .values({
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
        token: input.token,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
      })
      .returning();
    return row;
  }

  async listPendingForWorkspace(workspaceId: string): Promise<InvitationRow[]> {
    return this.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.status, "pending"),
        ),
      )
      .orderBy(desc(invitations.createdAt));
  }

  async findByToken(token: string): Promise<InvitationRow | null> {
    const rows = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Invitación + branding del workspace, por token (preview de aceptar). */
  async findByTokenWithWorkspace(token: string): Promise<InvitationWithWorkspace | null> {
    const rows = await this.db
      .select({
        id: invitations.id,
        workspaceId: invitations.workspaceId,
        email: invitations.email,
        role: invitations.role,
        token: invitations.token,
        status: invitations.status,
        invitedBy: invitations.invitedBy,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        updatedAt: invitations.updatedAt,
        workspaceName: workspaces.name,
        workspaceColor: workspaces.color,
        workspaceIcon: workspaces.icon,
      })
      .from(invitations)
      .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
      .where(eq(invitations.token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Revoca una invitación pendiente del workspace. `undefined` ⇒ no existe (404). */
  async revoke(workspaceId: string, invitationId: string): Promise<InvitationRow | undefined> {
    const [row] = await this.db
      .update(invitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.status, "pending"),
        ),
      )
      .returning();
    return row;
  }

  /**
   * Acepta la invitación: valida (pending, no expirada, email coincide), crea la
   * membership y marca accepted, todo en UNA transacción con relectura FOR UPDATE.
   * Si el usuario ya es miembro, el unique (workspace_id, user_id) lanza 23505 → 409.
   */
  async accept(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<{ workspaceId: string; role: string }> {
    return withTransaction(this.db, async (tx) => {
      const rows = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1)
        .for("update");
      const inv = rows[0];
      if (!inv) throw new InvitationNotFoundError();
      if (inv.status !== "pending") throw new InvitationNotPendingError();
      if (inv.expiresAt.getTime() < Date.now()) throw new InvitationExpiredError();
      if (inv.email.toLowerCase() !== userEmail.toLowerCase()) {
        throw new InvitationEmailMismatchError();
      }

      await tx.insert(workspaceMemberships).values({
        workspaceId: inv.workspaceId,
        userId,
        role: inv.role,
      });
      await tx
        .update(invitations)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(invitations.id, inv.id));

      return { workspaceId: inv.workspaceId, role: inv.role };
    });
  }

  /** Marca como revocada una invitación al declinarla (por el invitado). */
  async decline(token: string): Promise<void> {
    await this.db
      .update(invitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")));
  }
}
