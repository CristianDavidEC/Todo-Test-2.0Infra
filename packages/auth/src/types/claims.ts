/**
 * Claims que esperamos en el JWT Auth0.
 *
 * Custom claims (roles, user_id) se inyectarían bajo el namespace
 * `https://app.example.com/` (cambiable por proyecto vía AUTH0_NAMESPACE) mediante
 * una Auth0 Action post-login (`Add Custom Claims`).
 *
 * NOTA (plantilla base): la base NO incluye esa Action — depende de las reglas de
 * negocio de cada proyecto. Este reader y el resto del mecanismo RBAC (helpers,
 * RolesGuard, dashboard) están listos; mientras no exista una Action, `roles` y
 * `permissions` llegan vacíos (la autenticación funciona igual). Cada proyecto
 * derivado implementa su Action — guía/ejemplo en docs/SETUP-AUTH0.md §6.
 */

export const DEFAULT_AUTH0_NAMESPACE = "https://app.example.com/";

export interface Auth0StandardClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  azp?: string;
  scope?: string;
}

export interface Auth0CustomClaims {
  roles?: string[];
  permissions?: string[];
  userId?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

export type Auth0Claims = Auth0StandardClaims & Record<string, unknown>;

export function readCustomClaims(
  claims: Auth0Claims,
  namespace: string = DEFAULT_AUTH0_NAMESPACE,
): Auth0CustomClaims {
  return {
    roles: claims[`${namespace}roles`] as string[] | undefined,
    permissions: claims[`${namespace}permissions`] as string[] | undefined,
    userId: claims[`${namespace}user_id`] as string | undefined,
    email: claims["email"] as string | undefined,
    emailVerified: claims["email_verified"] as boolean | undefined,
    name: claims["name"] as string | undefined,
    picture: claims["picture"] as string | undefined,
    locale: claims["locale"] as string | undefined,
  };
}
