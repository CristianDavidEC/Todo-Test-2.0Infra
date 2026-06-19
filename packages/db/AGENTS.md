<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@app/db`

Acceso a datos: **Postgres** (Drizzle) como único datastore de la base. SST-free.
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- **Postgres (Drizzle)** es el único datastore de la plantilla. MongoDB y el RBAC por BD **no vienen** en la base (por simplicidad) — se reañaden por proyecto siguiendo las recetas de abajo.
- **SST-free**: lee `process.env.DATABASE_URL` (la infra lo inyecta). No importes `sst`.
- Consumido por `@app/auth` (lazyUpsert, peerDep type-only) y `apps/services/example-service`. **`apps/functions` NO lo consume hoy** (solo usa `@app/observability`; un handler que necesite Postgres añade `@app/db` a sus deps).

## Estructura

```
src/
  adapters/postgresql/{schema,client,users.repository,index}.ts   → único adapter activo
  index.ts
drizzle.config.ts · migrations/
```

## Patrones

1. **`getPostgresClient()` auto-detecta runtime** (cacheado a nivel módulo): Lambda (`AWS_LAMBDA_FUNCTION_NAME`) → driver **Neon HTTP serverless**; ECS/Node → pool **`pg`** TCP (max 10). No instancies clientes por request.
2. **Repository, NUNCA la tabla cruda.** Importa la clase (`UsersRepository`), no la tabla `users`. Drizzle permite `.select().from(users)`, pero el patrón exige pasar por la capa de dominio. (TS no lo impide — lo cuida la review.)
3. **El schema es la fuente; migraciones generadas.** Edita `adapters/postgresql/schema.ts` y corre `pnpm --filter @app/db db:generate` (drizzle-kit). **Nunca** escribas SQL de migración a mano. Mantén `migrations/` en historia **lineal** (conflictos de merge si no).
4. **`lazyUpsert()` = único punto de persistencia de usuario.** Inserta si es nuevo / si existe refresca `last_seen_at` **y re-sincroniza el perfil** (`email`/`name`/`picture`/`locale` desde los claims del token) — **atómico** vía `onConflictDoUpdate` sobre el unique `auth0UserId` (sin race del primer login, donde la SPA dispara varias llamadas). Es el **extension point** de onboarding: hoy no asigna roles ni dispara eventos — sobreescríbelo para tu dominio. Para correr lógica **solo-en-alta**, detecta el usuario nuevo con `wasJustCreated(row)`.

## Gotchas

- ⚠️ **Trampa de transacciones:** el driver **Neon HTTP** (Lambda) NO soporta `.transaction()` — lanza en runtime. El tipo unión `PostgresClient` oculta la diferencia, así que un `db.transaction(...)` "pasa" en ECS y truena en Lambda. Usa `supportsTransactions()` o `withTransaction(db, fn)` (fallan TEMPRANO con mensaje accionable en Lambda); para lógica transaccional, ubícala en un servicio ECS/NestJS (pool `pg`) o reescríbela a sentencias únicas / CTEs / `onConflict`.
- **El RBAC de la base es por claims de Auth0** (`@app/auth` / `RolesGuard`), NO por BD. `schema.ts` solo define la tabla `users`; no hay tablas `roles`/`user_roles` (ver receta de abajo para añadirlas).
- `drizzle.config.ts` carga `.env` a mano (corre fuera de SST; prioridad shell → `.env` del paquete → raíz).

## Recetas

- **Nueva tabla** → `schema.ts` + `db:generate` + nueva `*.repository.ts` (clase) + export en `index.ts`.

- **Reañadir MongoDB (datastore documental opcional):**
  1. `pnpm --filter @app/db add mongodb`.
  2. Crear `src/adapters/mongodb/{client,repository,index}.ts`: `getMongoClient()`/`getMongoDb()` (cacheados a nivel módulo, leen `process.env.MONGODB_URI`) y `MongoRepository<T>` base que mapea `id` ↔ `_id` (UUID string). Exportarlos desde `src/index.ts`.
  3. En infra: declarar el secret `MongodbUri` en `SECRETS_MANIFEST` (`shared/secrets.ts`) e inyectar `MONGODB_URI` como env var al cómputo que lo use. Mantenerlo **opt-in** (apagado por defecto).

- **Reañadir RBAC por BD (roles persistidos):**
  1. En `schema.ts` añadir las tablas `roles` y `user_roles` (FK a `users.id`, unique por `(userId, roleId)`).
  2. `pnpm --filter @app/db db:generate` para regenerar la migración (historia lineal).
  3. Crear el/los `*.repository.ts` (clase) y exportarlos en `index.ts`. Cablear el RBAC contra BD en `@app/auth`/los guards (hoy el RBAC es claim-based de Auth0).
