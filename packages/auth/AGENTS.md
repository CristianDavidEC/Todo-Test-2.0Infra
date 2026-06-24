<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@todo-list-poc-infra/auth`

Autenticación **Auth0-only**, multi-runtime (NestJS / Next.js).
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- Núcleo agnóstico (`auth0/`, `types/`, `helpers/`) + adapters por plataforma (`middleware/`).
- **peerDeps opcionales** (`@todo-list-poc-infra/db`, `@nestjs/common`, `@auth0/nextjs-auth0`): nunca hard-required → consumible desde NestJS o Next.js sin arrastrar runtimes ajenos. El consumidor trae el suyo.
- Deps duras: `@todo-list-poc-infra/types` (`User`) y `jose` (verificación JWT vía JWKS). **`@todo-list-poc-infra/db` es peerDep opcional, import type-only** (`UserRow`, se borra en build): el consumidor del guard NestJS lo provee; el subpath `/nextjs` NO lo necesita → mantiene `pg` fuera del grafo de instalación del frontend.

## Estructura

```
src/
  auth0/{types,jwt-verifier}.ts
  middleware/{nestjs.guard,nextjs.middleware}.ts
  types/{claims,session}.ts
  helpers/{require,user-mapper}.ts
```

## Patrones

1. **Verificación JWT vía JWKS** (`jose`/`createRemoteJWKSet`): cache **10 min** (`cacheMaxAge 600_000`), cooldown 30 s. **Sin red en el hot path** tras el primer fetch.
2. **Custom claims bajo namespace configurable** (default `https://app.example.com/`, env `AUTH0_NAMESPACE`). ⚠️ La **Auth0 Action** que inyecta esos claims **NO** viene en la plantilla → `roles`/`permissions` llegan vacíos hasta que la crees en el dashboard. El helper (`readCustomClaims`) ya está listo.
3. **Lazy upsert en la 1ª request autenticada** (NO en el login): `authorizeRequest()` llama `UsersRepository.lazyUpsert()` de `@todo-list-poc-infra/db` y devuelve `user: User` (Zod **validado** en el borde por `rowToUser` — `helpers/user-mapper.ts` mapea `UserRow` con fechas `Date` → `User` con fechas ISO; ya no es `unknown`). `RequestWithAuth.user` es `User`. El login de Next.js **no** crea el usuario en Postgres por sí solo.
4. **Lógica pura + wrapper por plataforma:** `authorizeRequest()` (NestJS, verifica JWT + hace el lazy upsert; devuelve `{ session, user }`) es framework-agnóstica — la app la envuelve en un Guard `@Injectable` **propio** (ver `apps/services/todo-service/src/auth/auth0.guard.ts`); este paquete NO exporta un `createAuth0Guard` (acoplaría `@nestjs/common`). `nextSessionToAuthSession` mapea la sesión del SDK Next. Subpath **`@todo-list-poc-infra/auth/nextjs`** para no meter NestJS en el bundle del front.
5. **Guards de invariantes** (`helpers/require.ts`): `requireUser`/`requireRole`/`requireAnyRole`/`requirePermission` lanzan si falla. Hoy el único consumido es `requireAnyRole` (lo usa el `RolesGuard` del servicio); el resto es scaffolding cableado-pero-dormido.

## Gotchas

- **`email` es obligatorio** para `lazyUpsert` (lanza si el claim falta) → el token debe traer el scope/claim `email`.
- `AuthSession` es un **snapshot** de la request; no se refresca si cambian permisos a mitad — hace falta un JWT nuevo.

## Receta

- **Proteger ruta NestJS** → define un Guard `@Injectable` en la app que llama `authorizeRequest(req, { usersRepo, namespace? })` y puebla `req.session`/`req.user` (patrón de `todo-service`). **Leer sesión en Next** → `nextSessionToAuthSession()` (vía subpath `@todo-list-poc-infra/auth/nextjs`).
