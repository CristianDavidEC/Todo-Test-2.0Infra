/**
 * @todo-list-poc-infra/auth
 *
 * Auth0 + lazy sync usuario en Postgres.
 *
 * Convenciones:
 * - Verificación JWT vía JWKS público del tenant (sin red en cada request, cached 10min)
 * - Custom claims bajo namespace `https://app.example.com/` (configurable)
 * - Lazy upsert en `users` la primera vez que un usuario autenticado hace request
 * - La lógica de autorización es pura (`authorizeRequest`); cada runtime la envuelve
 *   (Guard NestJS propio, middleware Next.js). Deps de plataforma (@nestjs/common,
 *   @auth0/nextjs-auth0, @todo-list-poc-infra/db) son peer opcionales.
 */

export * from "./auth0/types";
export * from "./auth0/jwt-verifier";
export * from "./types/claims";
export * from "./types/session";
export * from "./helpers/require";
export * from "./helpers/user-mapper";
export * from "./middleware/nestjs.guard";
export * from "./middleware/nextjs.middleware";
