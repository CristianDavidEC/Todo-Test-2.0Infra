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
