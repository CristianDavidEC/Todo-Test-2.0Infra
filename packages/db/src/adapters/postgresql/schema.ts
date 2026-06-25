import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// El RBAC de la plantilla es por claims de Auth0 (ver `requireAnyRole`/`RolesGuard`
// en el todo-service, que leen roles del JWT, NO de la BD). Si un proyecto necesita
// roles/permisos por BD, añade las tablas siguiendo la receta de packages/db/AGENTS.md.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    auth0UserId: text("auth0_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    picture: text("picture"),
    locale: text("locale"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    auth0UserIdUnique: uniqueIndex("users_auth0_user_id_unique").on(t.auth0UserId),
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Multi-tenancy (M1): Workspaces + memberships con roles por BD.
//
// El `role` se guarda como `text` (no `pgEnum`) a propósito: añadir valores a un
// enum Postgres exige `ALTER TYPE ... ADD VALUE` (migraciones frágiles), y la
// fuente de verdad de los roles es el schema Zod en @todo-list-poc-infra/types
// (`WorkspaceRoleSchema`). La BD valida lo mínimo; el dominio valida el resto.
// ---------------------------------------------------------------------------

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(), // 1–80 chars validado en Zod, no en BD
    color: text("color").notNull(), // token de color del preset Candy
    icon: text("icon").notNull(), // emoji
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id), // creador (independiente de las memberships)
    archivedAt: timestamp("archived_at", { withTimezone: true }), // soft-delete; null = activo
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdByIdx: index("workspaces_created_by_idx").on(t.createdBy),
  }),
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(), // 'owner' | 'member' (validado en Zod)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Un usuario aparece a lo sumo una vez por workspace. Duplicado → 23505 → 409.
    wsUserUnique: uniqueIndex("workspace_memberships_ws_user_unique").on(
      t.workspaceId,
      t.userId,
    ),
    userIdx: index("workspace_memberships_user_idx").on(t.userId), // listForUser
    wsIdx: index("workspace_memberships_ws_idx").on(t.workspaceId), // members + owner count
  }),
);

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;
export type WorkspaceMembershipRow = typeof workspaceMemberships.$inferSelect;
export type NewWorkspaceMembershipRow = typeof workspaceMemberships.$inferInsert;

// ---------------------------------------------------------------------------
// Proyectos (M2): entidad central dentro de un workspace.
//
// Autorización: reusa membership + rol de workspace (M1). No hay acceso granular
// por proyecto en M2 (ProjectMember diferido). `status` y `color` se guardan como
// `text`; la fuente de verdad es Zod en @todo-list-poc-infra/types (igual que role).
//
// `status` (active|paused|completed) es ORTOGONAL a `archivedAt` (soft-delete):
// 'archived' NO es un status; el listado oculta solo por `archivedAt`.
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }), // red de seguridad (ws es soft-delete)
    name: text("name").notNull(), // 1–80 chars validado en Zod
    key: text("key").notNull(), // 2–10 [A-Z0-9], único por workspace entre vivos
    description: text("description"), // opcional
    status: text("status").notNull().default("active"), // active|paused|completed (validado en Zod)
    color: text("color").notNull(), // token de color del preset Candy
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id), // creador (sin onDelete, espeja workspaces.createdBy)
    archivedAt: timestamp("archived_at", { withTimezone: true }), // soft-delete; null = activo
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Único parcial: los proyectos VIVOS no colisionan en `key`; la clave de un
    // proyecto archivado puede reutilizarse (BR-3/BR-4). Duplicado → 23505 → 409.
    wsKeyUnique: uniqueIndex("projects_ws_key_unique")
      .on(t.workspaceId, t.key)
      .where(sql`${t.archivedAt} is null`),
    wsIdx: index("projects_ws_idx").on(t.workspaceId), // listForWorkspace
  }),
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;

// ---------------------------------------------------------------------------
// Invitaciones (M3): invitar por email a un workspace con un rol. Auth0 sigue
// siendo identidad; la autorización (roles) es dato de dominio. El token es opaco
// y se valida contra `status`/`expiresAt`. `role` text (validado en Zod: admin|member|viewer).
// ---------------------------------------------------------------------------

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(), // admin|member|viewer (no owner por invitación)
    token: text("token").notNull(), // opaco; identifica la invitación al aceptar
    status: text("status").notNull().default("pending"), // pending|accepted|revoked
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("invitations_token_unique").on(t.token),
    // A lo sumo UNA invitación pendiente por (workspace, email) — case-insensitive (BR-6).
    wsEmailPendingUnique: uniqueIndex("invitations_ws_email_pending_unique")
      .on(t.workspaceId, sql`lower(${t.email})`)
      .where(sql`${t.status} = 'pending'`),
    wsIdx: index("invitations_ws_idx").on(t.workspaceId),
  }),
);

export type InvitationRow = typeof invitations.$inferSelect;
export type NewInvitationRow = typeof invitations.$inferInsert;

// ---------------------------------------------------------------------------
// Tablero Kanban (M4): board (1 por proyecto) → columns → tasks. `task_status_history`
// es CRÍTICO ⚠️: una fila por cada movimiento de columna (origen de burndown/cycle-time
// en M7). `priority`/`labels` validados en Zod. `estimate` (story points) para velocity.
// ---------------------------------------------------------------------------

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectUnique: uniqueIndex("boards_project_unique").on(t.projectId), // un board por proyecto (MVP)
  }),
);

export const boardColumns = pgTable(
  "board_columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    wipLimit: integer("wip_limit"), // null = sin límite
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    boardIdx: index("board_columns_board_idx").on(t.boardId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    columnId: uuid("column_id")
      .notNull()
      .references(() => boardColumns.id),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("medium"), // low|medium|high|urgent (Zod)
    assigneeId: uuid("assignee_id").references(() => users.id), // null = sin responsable
    estimate: integer("estimate"), // story points (≥0), null = sin estimar
    position: integer("position").notNull(),
    labels: jsonb("labels").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    dueDate: timestamp("due_date", { withTimezone: true }),
    sprintId: uuid("sprint_id"), // placeholder M6 (sin FK aún)
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }), // soft-delete
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    boardIdx: index("tasks_board_idx").on(t.boardId),
    columnIdx: index("tasks_column_idx").on(t.columnId),
    projectIdx: index("tasks_project_idx").on(t.projectId),
  }),
);

// ⚠️ Historia de cambios de columna. INMUTABLE (append-only). Sin esto no hay
// burndown/velocity/forecast (M7). Una fila por cada move.
export const taskStatusHistory = pgTable(
  "task_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fromColumnId: uuid("from_column_id"), // null en la creación
    toColumnId: uuid("to_column_id").notNull(),
    byUserId: uuid("by_user_id")
      .notNull()
      .references(() => users.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("task_status_history_task_idx").on(t.taskId),
  }),
);

export type BoardRow = typeof boards.$inferSelect;
export type NewBoardRow = typeof boards.$inferInsert;
export type BoardColumnRow = typeof boardColumns.$inferSelect;
export type NewBoardColumnRow = typeof boardColumns.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type TaskStatusHistoryRow = typeof taskStatusHistory.$inferSelect;
export type NewTaskStatusHistoryRow = typeof taskStatusHistory.$inferInsert;
