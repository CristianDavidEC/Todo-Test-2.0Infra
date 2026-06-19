import { eq } from "drizzle-orm";
import { users, type NewUserRow, type UserRow } from "./schema";
import type { PostgresClient } from "./client";

export interface LazyUpsertInput {
  auth0UserId: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  locale?: string | null;
}

export class UsersRepository {
  constructor(private readonly db: PostgresClient) {}

  async list(limit = 50): Promise<UserRow[]> {
    return this.db.select().from(users).limit(limit);
  }

  async create(input: NewUserRow): Promise<UserRow> {
    const [created] = await this.db.insert(users).values(input).returning();
    return created;
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByAuth0Id(auth0UserId: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.auth0UserId, auth0UserId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Lazy-sync de identidad Auth0 → Postgres.
   *
   * Es el ÚNICO punto donde un usuario de Auth0 aterriza en nuestra BD. NO hay
   * webhooks ni Auth0 Actions de sincronización inicial (decisión de arquitectura):
   * el alta ocurre orgánicamente la PRIMERA vez que el
   * usuario autenticado pega a una ruta protegida por `Auth0Guard`
   * (p.ej. `GET /api/me`). El `Auth0Guard` invoca este método tras verificar el JWT.
   *
   *   - usuario existe  → refresca `last_seen_at` Y el perfil (email/name/picture/locale)
   *                       desde el JWT, para que Postgres no quede desincronizado si el
   *                       usuario cambia esos datos en Auth0 (no hay webhooks).
   *   - usuario nuevo   → crea la fila con los datos del JWT
   *
   * PUNTO DE EXTENSIÓN (por proyecto): el alta de un usuario nuevo es donde típicamente
   * se enganchan reglas de negocio del onboarding — asignar un rol inicial en
   * `user_roles`, crear tenant/org, publicar un evento `user.registered`, pedir
   * campos extra, etc. Para correr esa lógica SOLO en el alta, detecta el caso con
   * `wasJustCreated(row)` (en un INSERT `created_at` y `last_seen_at` son idénticos; en
   * un refresh divergen). La plantilla base deja el alta "pelada" a propósito.
   *
   * ATOMICIDAD: es un upsert `ON CONFLICT` sobre el unique de `auth0_user_id`, NO un
   * check-then-insert. Dos requests concurrentes del primer login (la SPA dispara varias
   * llamadas tras autenticar) ya no compiten por insertar la misma fila → sin 500 por
   * violación de unique.
   *
   * `created_at` NUNCA se actualiza (solo se setea en el INSERT). Eso mantiene válida la
   * heurística de `wasJustCreated`: en un alta, `created_at` y `last_seen_at` provienen
   * del mismo `now()` de la transacción → idénticos; en un refresh, `last_seen_at` toma
   * `new Date()` (distinto de `created_at`) → divergen.
   */
  async lazyUpsert(input: LazyUpsertInput): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({
        auth0UserId: input.auth0UserId,
        email: input.email,
        name: input.name ?? null,
        picture: input.picture ?? null,
        locale: input.locale ?? null,
      })
      .onConflictDoUpdate({
        target: users.auth0UserId,
        set: {
          lastSeenAt: new Date(),
          // Re-sync del perfil desde el JWT (la fuente de verdad es Auth0).
          email: input.email,
          name: input.name ?? null,
          picture: input.picture ?? null,
          locale: input.locale ?? null,
        },
      })
      .returning();
    return row;
  }
}

/**
 * `true` si la fila acaba de crearse en este `lazyUpsert` (alta), `false` si fue un
 * refresh. Fiable porque `lazyUpsert` nunca actualiza `created_at`: en un alta ambos
 * timestamps salen del mismo `now()`; en un refresh `last_seen_at` diverge.
 * Útil para enganchar lógica de onboarding solo-en-alta.
 */
export function wasJustCreated(row: UserRow): boolean {
  return row.createdAt.getTime() === row.lastSeenAt.getTime();
}
