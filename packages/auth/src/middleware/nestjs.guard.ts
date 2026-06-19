/**
 * Lógica pura de autorización Auth0 (verificación JWT + lazy sync en Postgres),
 * agnóstica de framework. La app NestJS la envuelve en un Guard `@Injectable`
 * (ver apps/services/example-service/src/auth/auth0.guard.ts) — ese es el patrón
 * canónico; este módulo NO crea el Guard para no acoplar `@nestjs/common`.
 *
 * `authorizeRequest` ejecuta:
 *   1. Extrae Bearer token del header Authorization
 *   2. Verifica firma + audience + issuer via JWKS
 *   3. Resuelve usuario en Postgres (lazy upsert si no existe)
 *   4. Devuelve `{ session, user }` (user ya es un `User` Zod validado)
 */

import type { User } from "@app/types";
import { extractBearerToken, verifyAuth0Token, JwtVerificationError } from "../auth0/jwt-verifier";
import { readCustomClaims, DEFAULT_AUTH0_NAMESPACE } from "../types/claims";
import { rowToUser } from "../helpers/user-mapper";
import type { UsersRepository } from "@app/db";
import type { AuthSession } from "../types/session";

export interface Auth0GuardDeps {
  usersRepo: UsersRepository;
  namespace?: string;
}

export interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  session?: AuthSession;
  user?: User;
}

/**
 * Implementación pura del check. La clase NestJS la wrappea.
 * Devuelve `{ session, user }` (user ya es un `User` Zod validado) o lanza si falla.
 */
export async function authorizeRequest(
  req: RequestWithAuth,
  deps: Auth0GuardDeps,
): Promise<{ session: AuthSession; user: User }> {
  const auth = req.headers["authorization"] ?? req.headers["Authorization"];
  const token = extractBearerToken(Array.isArray(auth) ? auth[0] : auth);
  if (!token) throw new Error("Missing Bearer token");

  let claims;
  try {
    claims = await verifyAuth0Token(token);
  } catch (err) {
    if (err instanceof JwtVerificationError) throw new Error("Invalid token");
    throw err;
  }

  const namespace = deps.namespace ?? DEFAULT_AUTH0_NAMESPACE;
  const custom = readCustomClaims(claims, namespace);

  if (!custom.email) throw new Error("JWT missing email claim");

  const row = await deps.usersRepo.lazyUpsert({
    auth0UserId: claims.sub,
    email: custom.email,
    name: custom.name ?? null,
    picture: custom.picture ?? null,
    locale: custom.locale ?? null,
  });
  const user = rowToUser(row);

  const session: AuthSession = {
    auth0UserId: claims.sub,
    email: custom.email,
    emailVerified: custom.emailVerified ?? false,
    roles: custom.roles ?? [],
    permissions: custom.permissions ?? [],
    raw: claims,
    custom,
  };

  return { session, user };
}
