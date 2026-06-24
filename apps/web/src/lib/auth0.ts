import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Cliente Auth0 (SDK v4, server-side).
 *
 * Lee la config desde env vars: AUTH0_DOMAIN, AUTH0_CLIENT_ID,
 * AUTH0_CLIENT_SECRET, AUTH0_SECRET y APP_BASE_URL.
 *
 * Se usa en `proxy.ts` (auth0.middleware) y en server components
 * (auth0.getSession). La base se entrega SIN credenciales reales por defecto;
 * sin ellas el flujo de login no funciona en runtime (estado esperado hasta
 * que cada proyecto setee los secrets del tenant).
 *
 * `authorizationParams.audience` es CRÍTICO para llamar al backend: sin él, el
 * access token que emite Auth0 no lleva el claim `aud` = API, y el `todo-service`
 * (que valida `aud` contra `AUTH0_AUDIENCE`) responde 401 a TODA llamada. El mismo
 * `AUTH0_AUDIENCE` se inyecta al web y al servicio (ver infra), así que el token
 * valida. `offline_access` habilita el refresh token para `getAccessToken()`.
 */
export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});

/**
 * ¿Auth0 tiene credenciales reales en runtime?
 *
 * El auth está cableado pero la base no trae credenciales por defecto.
 * Sin `AUTH0_SECRET`/`AUTH0_CLIENT_SECRET`/`AUTH0_DOMAIN`, llamar a
 * `auth0.middleware()` o `auth0.getSession()` LANZA → 500 en todas las rutas.
 *
 * Este flag permite que `proxy.ts` y las páginas hagan no-op graceful mientras
 * no haya credenciales, de modo que el sitio público funcione igual. Al setear
 * los secrets del tenant, el flag pasa a `true` automáticamente y el flujo de
 * auth se activa sin cambiar código.
 */
export const isAuth0Configured = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET,
);
