import { UserSchema, type User } from "@todo-list-poc-infra/types";
import type { UserRow } from "@todo-list-poc-infra/db";

/**
 * Convierte la fila de persistencia (`UserRow` de `@todo-list-poc-infra/db`, fechas `Date`) al `User`
 * de transporte (Zod de `@todo-list-poc-infra/types`, fechas ISO `string`) y lo VALIDA con `UserSchema`.
 *
 * Es el punto único donde la BD cruza al dominio: cumple la promesa "Zod = fuente de
 * verdad" en el borde, en vez de tipar `req.user` como `User` mientras carga un `UserRow`
 * crudo (sus fechas `Date` no son ISO string → no conformaban el contrato).
 *
 * Nota: el import de `UserRow` es type-only → se borra en build, así `@todo-list-poc-infra/db` puede ser
 * peerDependency opcional de `@todo-list-poc-infra/auth` (no se arrastra al grafo del frontend).
 */
export function rowToUser(row: UserRow): User {
  return UserSchema.parse({
    id: row.id,
    auth0UserId: row.auth0UserId,
    email: row.email,
    name: row.name,
    picture: row.picture,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  } satisfies User);
}
