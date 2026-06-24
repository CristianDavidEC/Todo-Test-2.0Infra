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
 * derivado implementa su Action según sus reglas de negocio.
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
  // Los claims de perfil (email, name, …) sólo existen "bare" en el ID token; el
  // access token de Auth0 NO los lleva y, por OIDC, Auth0 sólo admite claims
  // custom *namespaced* en él. Por eso una Action post-login los inyecta como
  // `${namespace}email`, etc. Leemos namespace-first con fallback al claim bare
  // para servir ambos caminos: access token (NestJS) e ID token (Next.js).
  const ns = <T>(key: string): T | undefined =>
    (claims[`${namespace}${key}`] ?? claims[key]) as T | undefined;

  return {
    roles: claims[`${namespace}roles`] as string[] | undefined,
    permissions: claims[`${namespace}permissions`] as string[] | undefined,
    userId: claims[`${namespace}user_id`] as string | undefined,
    email: ns<string>("email"),
    emailVerified: ns<boolean>("email_verified"),
    name: ns<string>("name"),
    picture: ns<string>("picture"),
    locale: ns<string>("locale"),
  };
}
