/**
 * Helper de integración Next.js + Auth0 (SDK v4, Next.js 16).
 *
 * La app `apps/web/` instala `@auth0/nextjs-auth0@^4` y configura:
 *   - `src/lib/auth0.ts` con `export const auth0 = new Auth0Client()`
 *   - `proxy.ts` (Next.js 16; en Next.js 15 sería `middleware.ts`) con
 *     `export async function proxy(req) { return auth0.middleware(req); }`
 *     → monta automáticamente las rutas `/auth/login|logout|callback|profile`
 *   - server components: `await auth0.getSession()`
 *   - client components: `Auth0Provider` + `useUser()` desde `@auth0/nextjs-auth0`
 *
 * Este archivo NO duplica la lógica del SDK; expone un helper para mapear
 * la sesión Next.js (`session.user`) → nuestro `AuthSession` cross-platform.
 */

import { readCustomClaims, DEFAULT_AUTH0_NAMESPACE } from "../types/claims";
import type { AuthSession } from "../types/session";

export interface NextAuth0Session {
  user: {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    locale?: string;
    [key: string]: unknown;
  };
  accessToken?: string;
  idToken?: string;
}

export function nextSessionToAuthSession(
  next: NextAuth0Session,
  namespace: string = DEFAULT_AUTH0_NAMESPACE,
): AuthSession {
  const custom = readCustomClaims(next.user as never, namespace);
  return {
    auth0UserId: next.user.sub,
    email: next.user.email ?? custom.email ?? "",
    emailVerified: Boolean(next.user.email_verified),
    roles: custom.roles ?? [],
    permissions: custom.permissions ?? [],
    raw: next.user as never,
    custom,
  };
}
