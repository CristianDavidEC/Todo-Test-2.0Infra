import { and, desc, eq, isNull } from "drizzle-orm";
import { projects, type ProjectRow } from "./schema";
import type { PostgresClient } from "./client";

export type ProjectStatus = "active" | "paused" | "completed";

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  key: string;
  description?: string | null;
  color: string;
  status?: ProjectStatus; // default 'active' en BD
  createdBy: string;
}

export interface UpdateProjectPatch {
  name?: string;
  key?: string;
  description?: string | null;
  color?: string;
  status?: ProjectStatus;
}

/**
 * Acceso a proyectos. TODO método está scoped por `workspaceId` (aislamiento de tenant):
 * un proyecto de otro workspace es invisible (→ null → 404 en el service).
 *
 * Sin transacciones (a diferencia de WorkspacesRepository): M2 escribe UNA sola tabla.
 * La unicidad de `key` la garantiza el índice único parcial de forma atómica
 * (duplicado vivo → 23505 → 409 vía AllExceptionsFilter). No hay read-then-insert.
 */
export class ProjectsRepository {
  constructor(private readonly db: PostgresClient) {}

  /** Crea un proyecto. Clave duplicada entre vivos → 23505 → 409 (BR-3). */
  async create(input: CreateProjectInput): Promise<ProjectRow> {
    const [row] = await this.db
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        name: input.name,
        key: input.key,
        description: input.description ?? null,
        color: input.color,
        status: input.status ?? "active",
        createdBy: input.createdBy,
      })
      .returning();
    return row;
  }

  /** Proyectos ACTIVOS del workspace (BR-6: oculta archivados). */
  async listForWorkspace(workspaceId: string): Promise<ProjectRow[]> {
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)))
      .orderBy(desc(projects.createdAt));
  }

  /**
   * Proyecto por id SOLO dentro de su workspace (BR-5). Scoped por AMBOS ids → un
   * proyecto de otro workspace devuelve null. NO filtra `archivedAt` (el detalle de
   * un proyecto archivado sigue accesible por id, espeja `findByIdForUser` de M1).
   */
  async findByIdInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRow | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Actualiza solo los campos definidos. `undefined` (ninguna fila) ⇒ el service lo
   * traduce a 404. Cambiar `key` a una duplicada viva → 23505 → 409.
   */
  async update(
    workspaceId: string,
    projectId: string,
    patch: UpdateProjectPatch,
  ): Promise<ProjectRow | undefined> {
    const set: Partial<
      Pick<ProjectRow, "name" | "key" | "description" | "color" | "status">
    > & { updatedAt: Date } = { updatedAt: new Date() };
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.key !== undefined) set.key = patch.key;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.color !== undefined) set.color = patch.color;
    if (patch.status !== undefined) set.status = patch.status;

    const [row] = await this.db
      .update(projects)
      .set(set)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .returning();
    return row;
  }

  /** Soft-delete (BR-6): marca `archivedAt`. `undefined` ⇒ service 404. */
  async archive(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectRow | undefined> {
    const now = new Date();
    const [row] = await this.db
      .update(projects)
      .set({ archivedAt: now, updatedAt: now })
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .returning();
    return row;
  }
}
