# Aplicaciones

> El árbol de carpetas de cada app vive en [`docs/02-estructura-proyecto.md`](./02-estructura-proyecto.md). Aquí se documentan los **patrones**: cómo se construye, se cablea y se ejecuta cada tipo de app.

## `apps/web` — Frontend Next.js 16

Next.js 16 (App Router, React 19, Tailwind 4). Consume `@app/core` y `@app/auth` (añade `@app/types` solo si necesitas schemas Zod compartidos).

### Transpilación de packages internos

`next.config.js` lista los `@app/*` consumidos en `transpilePackages` (se entregan como TS source, no compilados):

```js
const nextConfig = {
  transpilePackages: ["@app/core", "@app/auth"],
};
```

### Auth0 SDK v4 con `proxy.ts` (no `middleware.ts`)

En Next.js 16 el network boundary se intercepta en **`src/proxy.ts`** (en Next.js 15 sería `middleware.ts`). Monta el cliente Auth0 (`@auth0/nextjs-auth0` v4) creado en `src/lib/auth0.ts` (`export const auth0 = new Auth0Client()`):

```typescript
// src/proxy.ts
import { auth0, isAuth0Configured } from "./lib/auth0";

export async function proxy(request: NextRequest) {
  if (!isAuth0Configured) return NextResponse.next();
  return await auth0.middleware(request);
}
```

`auth0.middleware()` monta automáticamente `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile`, etc.

**Guard `isAuth0Configured`:** sin credenciales reales (`AUTH0_DOMAIN`/`AUTH0_CLIENT_ID`/`AUTH0_CLIENT_SECRET`/`AUTH0_SECRET`), llamar a `auth0.middleware()` o `auth0.getSession()` lanzaría y devolvería 500 en TODA request. El flag permite un no-op graceful para que el sitio público funcione hasta que los secrets existan; entonces pasa a `true` y el auth se activa sin tocar código.

> **Despliegue (ver `docs/07`):** SST fuerza `openNextVersion: "4.0.3"` porque el default de SST no entiende `proxy.ts` de Next 16.

---

## `apps/functions` — Lambda Handlers

Handlers Lambda en TypeScript **sin framework**. Los tipos vienen de `@types/aws-lambda`. Un solo `package.json` centraliza las dependencias; declara solo los `@app/*` que realmente usa (hoy `@app/observability`).

### Convención de handler

- Archivo `<accion>.ts` (organizado por dominio: `src/handlers/<dominio>/<accion>.ts`). **NO** se usa el sufijo `.handler.ts` en el nombre del archivo.
- Export nombrado `handler`.
- Envuelto en `instrumentHandler` de `@app/observability` (extrae el correlationId, loggea start/end/error y propaga el contexto vía `AsyncLocalStorage`). Ese es el patrón estándar — **no existe** una carpeta `src/shared/` con error-handler/logger/middleware propios.

El único handler actual es `src/handlers/health/ping.ts`:

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { instrumentHandler, createPowertoolsLogger } from "@app/observability";

const logger = createPowertoolsLogger({
  service: "functions",
  stage: process.env.SST_STAGE ?? "unknown",
});

export const handler = instrumentHandler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>(
  async () => ({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, stage: process.env.SST_STAGE ?? "unknown", timestamp: new Date().toISOString() }),
  }),
  { logger },
);
```

### Bundling

Cuando SST hace el build, esbuild toma cada handler como entry point independiente y genera un bundle con tree-shaking (solo lo que ese handler importa).

### Cómo se cablea una Lambda

Las rutas se registran con `api.route(...)` sobre el `ApiGatewayV2` de `infra/src/apis/main-api.ts`. El `handler` apunta al archivo más el nombre del export (`.handler`). **Nunca** se usa `new sst.aws.Function`:

```typescript
api.route("GET /ping", {
  handler: "apps/functions/src/handlers/health/ping.handler",
});
```

### Cómo agregar un nuevo handler Lambda

1. Crear carpeta en `apps/functions/src/handlers/<dominio>/`
2. Crear `<accion>.ts` con `export const handler = instrumentHandler(...)`
3. Cablear en `infra/src/apis/main-api.ts` con `api.route("<MÉTODO> /<ruta>", { handler: "apps/functions/src/handlers/<dominio>/<accion>.handler" })`
4. Si necesita acceso a recursos (BD, secrets), añadir `link: [...]` en esa ruta
5. Si necesita dependencias nuevas, agregarlas al `package.json` de `apps/functions`

---

## `apps/services/example-service` — Servicio Fargate (NestJS 11)

Servicio NestJS 11 en ECS Fargate, con su propia carpeta, `Dockerfile`, build y dependencias.

### Build con esbuild (no `nest build`)

Los packages workspace `@app/*` se entregan como TS source, así que `nest build` (tsc) no los resolvería en runtime. El servicio se **bundlea con esbuild** (`esbuild.config.mjs`): inline de los `@app/*` en `dist/main.js`, externalizando todos los npm deps (resuelven en `node_modules` del contenedor). Por eso:

- **dev:** `tsx watch ... src/main.ts` (live-reload).
- **build:** `node esbuild.config.mjs`.
- **start:** `node dist/main.js`.

Nunca `nest build` / `nest start`.

### Bootstrap NestJS

`src/main.ts` configura:

- Logger JSON estructurado compartido (`PinoLoggerService` sobre `@app/observability`).
- `correlationMiddleware` global (ancla el request en el `AsyncLocalStorage` antes del router).
- **Prefijo global `/api`** (`setGlobalPrefix("api")`) → alinea con la ruta privada `ANY /api/{proxy+}` del API Gateway.
- **Filtro global de excepciones** (`useGlobalFilters(new AllExceptionsFilter())`, en `src/common/all-exceptions.filter.ts`): mapea `ZodError`→400, unique-violation→409, etc.
- **Swagger** montado en `/api/docs` (JSON en `/api/docs-json`) **solo si `APP_STAGE !== "prod"`** — no se expone en producción (el API Gateway es público).

### Auth: guard propio

El servicio define su **propio** `Auth0Guard` (`src/auth/auth0.guard.ts`), que envuelve la lógica pura `authorizeRequest()` de `@app/auth` en un guard `@Injectable` y deja `req.session`/`req.user` poblados. Se aplica con `@UseGuards(Auth0Guard)` a nivel de controller (ver `UsersController`/`MeController`). El RBAC es por claims de Auth0 vía `RolesGuard` + `@Roles("admin")`, no por BD.

### Health check

`HealthController` expone `GET /api/health` (`{ status: "ok", service: "example-service" }`). Lo consume tanto el `HEALTHCHECK` del Dockerfile como el health check de la task ECS (definido en `infra/src/services/workers.ts`, ya que no hay ALB).

### Dockerfile endurecido

Multi-stage (`node:22-alpine`):

- **builder:** instala con pnpm (`--frozen-lockfile`), copia el código y bundlea con `pnpm run build` (esbuild).
- **production:** copia `dist/` + deps de producción (`pnpm install --prod`), corre como usuario no-root `node`, con `tini` como init PID 1, `ENV NODE_ENV=production`, `EXPOSE 3001` y un `HEALTHCHECK` contra `/api/health`.

### Cómo agregar un nuevo servicio Fargate

1. Crear `apps/services/<nombre-servicio>/`
2. `package.json` con nombre `@app/<nombre-servicio>`, NestJS + paquetes internos, y scripts `dev` (tsx), `build` (esbuild), `start`
3. `esbuild.config.mjs` que inline-bundlee los `@app/*` y externalice los npm deps
4. `tsconfig.json` extendiendo `tsconfig.nest.json` de `@app/config` (ya trae `emitDecoratorMetadata`/`experimentalDecorators`)
5. Estructura NestJS (`src/main.ts`, `src/app.module.ts`, `src/modules/`) con `setGlobalPrefix("api")`
6. `Dockerfile` basado en el de `example-service`
7. Registrar en `infra/src/services/workers.ts` para el despliegue en Fargate
8. `pnpm install` desde la raíz
