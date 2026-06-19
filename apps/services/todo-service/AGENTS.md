<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@todo-list-poc-infra/todo-service`

**API NestJS principal del proyecto** (CRUDs síncronos). Sigue el patrón generalista de
[`apps/services/AGENTS.md`](../AGENTS.md) — **léelo primero**; aquí solo va lo específico de este servicio.

## Qué expone

Prefijo global `/api`. Swagger en `/api/docs` (JSON en `/api/docs-json`), **solo si `APP_STAGE !== "prod"`**.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | pública | Health check (smoke test / ECS) |
| `GET` | `/api/users` | JWT | Lista usuarios (máx 50) |
| `GET` | `/api/users/:id` | JWT | Usuario por id (404 si no existe) |
| `GET` | `/api/me` | JWT | Sesión + usuario sincronizado (lazy upsert) |
| `GET` | `/api/me/admin/ping` | JWT + rol `admin` | Ejemplo RBAC (`@UseGuards(Auth0Guard, RolesGuard)` + `@Roles("admin")`) |

¹ `users` es **solo lectura** y protegido con `Auth0Guard` a nivel de clase (expone PII). **No hay endpoint de creación**: el alta ocurre vía `lazyUpsert` en el primer login autenticado, no por POST con `auth0UserId` arbitrario. Para gestión administrativa, añade endpoints con `@Roles("admin")`.

## Particularidades

- **Dos controllers en un mismo feature module** (`UsersModule`): `UsersController` (`/users`, lectura
  protegida con `@UseGuards(Auth0Guard)` a nivel de clase) y `MeController` (`/me`, también `@UseGuards(Auth0Guard)`).
  `MeController.adminPing()` es el **ejemplo RBAC** canónico (ver orden de guards en el generalista).
- **`toPublic(row)`** (función a nivel de módulo en `users.service.ts`, no un método de clase) mapea
  `UserRow` → `PublicUserDto` (omite `auth0UserId`, fechas a ISO). Patrón a copiar: el service nunca devuelve la fila cruda.
- **DTOs Zod** re-exportados de `@todo-list-poc-infra/types` en `users.dto.ts` (no se redefinen). Swagger describe el shape
  a mano (`PUBLIC_USER_EXAMPLE`) porque los DTOs son Zod, no clases.
- **Auth0 (cableado, sin credenciales por defecto):** el login real funciona en cuanto el proyecto setea los secrets del tenant; `MeController` hace lazy-upsert vía `Auth0Guard`. Los roles
  (`/api/me/admin/ping`) dependen de una Auth0 Action que pueble los claims — **omitida por diseño** en la
  base (depende de reglas de negocio, ver `docs/SETUP-AUTH0.md` §6); sin ella, `roles` llega vacío → 403.

## Notas

- **Correlación:** `main.ts` registra el middleware global `correlationMiddleware` (`src/logging/correlation.middleware.ts`) con `app.use(...)` antes del router, para que guards/services/logs compartan el `correlationId`. El `Auth0Guard` llama `setUserId` tras el upsert → los logs posteriores llevan `userId`.
- **Dockerfile = el molde endurecido:** corre como usuario no-root `node`, `tini` como `ENTRYPOINT` (PID 1, señales/zombies), `HEALTHCHECK` contra `/api/health`, y `ENV NODE_ENV=production` (modo prod de las libs + evita que Pino caiga a `pino-pretty` en prod). `docker-compose.yml` también trae su healthcheck.
- **Health check de la task ECS:** `workers.ts` define un `health` a nivel de task (`wget --spider http://localhost:3001/api/health`) — sin ALB, es ECS quien marca la task unhealthy y la reemplaza si NestJS se cuelga sin crashear.
- Boot verificado: `node dist/main.js` → `GET /api/health` 200, `GET /api/me` 401 (sin token), `GET /api/users` 401 (sin token).
- Su estructura y `Dockerfile` sirven de **referencia** para crear nuevos servicios (ver [`../AGENTS.md`](../AGENTS.md)).

## See also

- [`apps/services/AGENTS.md`](../AGENTS.md) — patrón obligatorio de todo servicio (la referencia principal).
- [`AGENTS.md` raíz](../../AGENTS.md) · `@todo-list-poc-infra/auth` · `@todo-list-poc-infra/db` · `@todo-list-poc-infra/types`.
