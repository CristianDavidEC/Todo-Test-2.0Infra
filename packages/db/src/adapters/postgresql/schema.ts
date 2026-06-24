import { pgTable, text, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

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
