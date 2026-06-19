<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `apps/services/*` (servicios NestJS)

Guía **generalista** para CUALQUIER servicio NestJS del monorepo. Todos siguen el mismo patrón de
arquitectura y funcionamiento; un servicio concreto puede tener su propio `AGENTS.md` (más cercano,
gana) que **complementa** a este, no lo contradice. Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- **NestJS 11 sobre ECS Fargate.** Es la **API principal síncrona** (CRUDs, operaciones user-facing).
- **Un servicio por dominio** (`apps/services/<nombre>/`). El trabajo async/event-driven NO va aquí → va en `apps/functions` (Lambdas, regla de la base: ECS para CRUD síncrono, Lambda solo async).
- Expuesto vía **API Gateway → VPC Link + Cloud Map** (sin ALB). Todas las rutas bajo `/api`.

## Arquitectura (obligatoria, igual en todos los servicios)

Capas con responsabilidad única (`arch-single-responsibility`, `arch-feature-modules`):

```
HTTP → Controller → Service → Repository (@app/db) → Postgres
            ↑ Guards (auth/RBAC)     ↑ lógica de negocio    ↑ datos
```

- **Controller** — solo HTTP: rutas, validación de entrada (Zod), serialización de salida, códigos. Sin lógica de negocio ni acceso directo a BD.
- **Service** (`@Injectable`) — lógica del dominio; orquesta repositorios y mapea fila→DTO público.
- **Repository** — viene de `@app/db` (patrón repositorio, `arch-use-repository-pattern`). El servicio **nunca** toca la tabla cruda ni arma SQL.
- **Feature modules** — se organiza por dominio (`modules/<feature>/`), NO por capa técnica.
- **Composition modules** — `db/` y `auth/` proveen e **exportan** los providers compartidos (`arch-module-sharing`).

## Estructura estándar

```
src/
  main.ts                         → bootstrap (prefijo /api, logger Pino, Swagger, listen)
  app.module.ts                   → raíz: importa los feature modules
  modules/<feature>/
    <feature>.controller.ts       → rutas HTTP + Swagger + validación Zod
    <feature>.service.ts          → @Injectable, lógica, mapeo a DTO
    <feature>.dto.ts              → re-export de schemas/tipos Zod de @app/types (NO redefinir)
    <feature>.module.ts           → declara controllers/providers, importa DbModule/AuthModule
  db/db.module.ts                 → provee repos de @app/db (resuelve DATABASE_URL)
  auth/                           → Auth0Guard + RolesGuard + @Roles (RBAC)
  common/all-exceptions.filter.ts → filtro global de excepciones (ZodError→400, unique-violation→409, …)
  logging/pino-logger.service.ts  → adaptador Pino → LoggerService de Nest
```

## Convenciones clave

**Bootstrap (`main.ts`):** `import "reflect-metadata"` primero · `app.useLogger(new PinoLoggerService())`
· `app.use(correlationMiddleware)` (middleware global de Express que ancla cada request en el
`AsyncLocalStorage` de correlación — sin él los logs no llevan `correlationId`) · `app.setGlobalPrefix("api")`
(alinea con `routePrivate("ANY /api/{proxy+}")`) · `app.useGlobalFilters(new AllExceptionsFilter())`
(`common/all-exceptions.filter.ts`: mapea `ZodError`→400, unique-violation→409, etc.) · Swagger en `/api/docs` **solo si `APP_STAGE !== "prod"`** · `app.listen(process.env.PORT ?? 3001)`.

**Inyección de dependencias (`di-prefer-constructor-injection`):** siempre por constructor. Los repos
se proveen con `useFactory` en `DbModule` (resuelve `process.env.DATABASE_URL` → `getPostgresClient`),
manteniendo `@app/db` libre de SST (regla de capas). DbModule **exporta** el repo; el feature module lo importa.

**Auth & RBAC (`security-use-guards`):** `@UseGuards(Auth0Guard, RolesGuard)` + `@Roles("admin")`.
**El orden importa:** `Auth0Guard` SIEMPRE antes que `RolesGuard` (el primero puebla `request.session`;
el segundo lee `session.roles`). `Auth0Guard` verifica el JWT (JWKS público) y hace lazy-upsert del usuario.
`RolesGuard` es claim-based (no toca BD).

**Validación (`security-validate-all-input`):** Zod es la source of truth. Los schemas viven en `@app/types`
y el `.dto.ts` solo los **re-exporta** (nunca re-derivar `ZodObject` local → doble instancia de zod = tipos rotos).
Hoy se valida con `Schema.safeParse(body)` + `BadRequestException` en el controller.

**Logging (`devops-use-logging`):** `PinoLoggerService` (adaptador de `@app/observability`). JSON estructurado
+ redactor PII. **Nunca** `console.log`.

**Errores (`error-throw-http-exceptions`):** lanzar excepciones HTTP de Nest (`NotFoundException`,
`BadRequestException`, …); Nest las serializa.

## Build & runtime (por qué esbuild)

Los `@app/*` exponen TS source (`main: ./src/index.ts`), así que `tsc`/`nest build` **no** los resuelve
en runtime. Solución: **esbuild** (`esbuild.config.mjs`) bundlea los `@app/*` inline en `dist/main.js` y
**externaliza** los npm deps. Por eso esos npm deps (NestJS, `pg`, `drizzle-orm`, `@neondatabase/serverless`,
`jose`, `pino`, `zod`, `reflect-metadata`, `rxjs`) se declaran como **deps directas del servicio** (resuelven
en `node_modules` del contenedor). Dev usa `tsx watch` (TS on-the-fly). `tsconfig.json` extiende
`tsconfig.nest.json` (CommonJS + decoradores). `type-check` corre con `--max-old-space-size=4096`
(NestJS + Drizzle + Zod agotan el heap por defecto de tsc).

## Ejecución local

Un **único `.env` en la raíz** del monorepo es la fuente local para todo (lo comparten SST, drizzle, `apps/web`
y los servicios). **No hay `.env` ni `.env.example` por servicio.** Cópialo una vez: `cp .env.example .env` (desde la raíz).
Bajo `sst dev` las env vars que inyecta SST **tienen prioridad** sobre el `.env`, y el script no rompe si no
existe (`--env-file-if-exists`).

| Modo | Comando | Env | Cuándo |
|---|---|---|---|
| **Standalone** | `pnpm --filter @app/<servicio> dev` | `.env` de la raíz (lo carga el script vía `../../../.env`) | loop de desarrollo más rápido; apunta `DATABASE_URL` a tu branch Neon |
| **SST** | `pnpm sst dev --stage <user>` | inyectado por SST (Resource links + secrets) | cuando necesitas el cableado completo (API Gateway, Cloud Map, secrets SSM) |
| **Docker** | `docker compose up <servicio>` (dev, hot-reload) · o `docker build`+`docker run --env-file .env` (paridad prod) | el **mismo** `.env` de la raíz | paridad con el contenedor / debug del deploy — **no** es el loop diario |

`pnpm dev` corre `tsx watch --env-file-if-exists=../../../.env` (carga el `.env` de la raíz; no hay
`.env` por servicio). Para correr 2 servicios a la vez, override de puerto inline
(`PORT=3002 pnpm --filter <svc> dev`). Detalle de Docker: [docs/08-desarrollo-local.md](../../docs/08-desarrollo-local.md).

## Infra wiring

`infra/src/services/workers.ts` → `cluster.addService(...)` con `serviceRegistry: { port: 3001 }` (sin ALB),
`environment: { DATABASE_URL, AUTH0_* }`, `dev: { command: "pnpm dev" }`. `infra/src/apis/main-api.ts` →
`routePrivate("ANY /api/{proxy+}")` al Cloud Map del service (solo en `!$dev`).

## Cómo crear un servicio nuevo

1. `apps/services/<nombre>/` con `package.json` (`@app/<nombre>`), `tsconfig.json` (extiende `tsconfig.nest.json`), `eslint.config.js` (preset `@app/config/eslint.node.js`), `esbuild.config.mjs`, `Dockerfile`. Copiar de `example-service`. (El `.env` vive solo en la raíz; no hay `.env`/`.env.example` por servicio.) El script `dev` carga el `.env` raíz con `--env-file-if-exists=../../../.env`.
2. `main.ts` + `app.module.ts` con las convenciones de arriba. Feature modules en `modules/<feature>/`.
3. Reusar `db/db.module.ts`, `auth/`, `logging/pino-logger.service.ts` (mismo patrón).
4. Cablear en `infra/src/services/workers.ts` (+ ruta si necesita superficie pública).
5. `pnpm --filter @app/<nombre> type-check lint`.

## Anti-patterns

- ❌ Lógica de negocio o SQL en el controller → controller solo HTTP.
- ❌ Acceder a la tabla cruda / armar el cliente Postgres a mano → usar el repo de `@app/db` vía DbModule.
- ❌ Re-derivar schemas Zod localmente → re-exportar de `@app/types`.
- ❌ `console.log` → `PinoLoggerService`.
- ❌ Invertir el orden de guards (`RolesGuard` antes que `Auth0Guard`) → 403 siempre.
- ❌ CRUD/lógica async pesada → eso es Lambda (`apps/functions`), no el servicio.
- ❌ Inyección por propiedad / service locator (`app.get(...)` fuera de bootstrap) → constructor injection.


## See also

- [`AGENTS.md` raíz](../../AGENTS.md) · `.claude/skills/nestjs-best-practices/` (40 reglas)
- `@app/auth` (guards/JWT/RBAC) · `@app/db` (repos) · `@app/observability` (Pino) · `@app/types` (Zod)
- `infra/src/services/workers.ts` · `infra/src/apis/main-api.ts`
