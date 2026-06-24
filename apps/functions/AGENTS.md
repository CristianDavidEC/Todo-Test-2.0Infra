<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@todo-list-poc-infra/functions`

AWS Lambda handlers en **TypeScript nativo, sin framework**. Tipos desde `@types/aws-lambda`.
Este archivo es la guía local; el más cercano gana sobre el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

Este paquete contiene **solo** trabajo asíncrono / event-driven (regla de la base: las Lambdas son solo para async; el CRUD síncrono vive en NestJS/ECS):

- **Webhooks** de terceros (Stripe, Twilio, …) — HTTP vía API Gateway.
- **Consumidores** de SQS / EventBridge.
- **Jobs programados** (EventBridge Scheduler).
- **Procesamiento pesado** fuera del request path.

**NO va aquí:** CRUDs ni APIs síncronas user-facing → eso vive en NestJS/ECS (`apps/services/*`).
Regla de oro: *"¿Lambda o ECS? Default ECS. Lambda solo si: (a) responde a evento async, (b) picos muy variables, o (c) bloquearía al ECS."*

## Estructura

```
src/
  handlers/<dominio>/<accion>.ts   → un handler por archivo; export nombrado `handler`
```

- Un handler = un archivo bajo `handlers/<dominio>/`. Ejemplo vivo: [`handlers/health/ping.ts`](src/handlers/health/ping.ts).
- Si necesitas **glue específico de Lambda** (tipos de `aws-lambda`, helpers HTTP), crea `shared/` aquí. Helpers cross-runtime van en `packages/`, no aquí.

## Patrón estándar (obligatorio)

**Todo handler se envuelve en `instrumentHandler` de `@todo-list-poc-infra/observability`.** Eso extrae el
`correlationId`, loggea start/end/error y lo propaga vía `AsyncLocalStorage`. El logger se crea
con `createPowertoolsLogger`.

```ts
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { instrumentHandler, createPowertoolsLogger } from "@todo-list-poc-infra/observability";

const logger = createPowertoolsLogger({ service: "functions", stage: process.env.SST_STAGE ?? "unknown" });

export const handler = instrumentHandler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>(
  async (event) => {
    // ... lógica
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  },
  { logger },
);
```

> **Gotcha `SST_STAGE`:** en runtime desplegado esa env var puede no estar inyectada (no es automática en Lambda). El sampling de prod de Powertools depende de `stage === "prod"`, así que si quieres sampling correcto inyecta el stage explícitamente (p.ej. `APP_STAGE` vía infra) en vez de confiar en `SST_STAGE`.

### Acceso a recursos (DB, secrets)

Los recursos se **linkean en infra** y se leen como env vars. La única dep del paquete hoy es `@todo-list-poc-infra/observability` (core/db/types se removieron por no usarse); **cada handler nuevo agrega los `@todo-list-poc-infra/*` que de verdad necesite** (p.ej. `@todo-list-poc-infra/db` para Postgres):

```ts
import { getPostgresClient } from "@todo-list-poc-infra/db"; // añade @todo-list-poc-infra/db a las deps del paquete
const db = getPostgresClient(process.env.DATABASE_URL); // auto-detecta el driver HTTP de Neon en Lambda
```

### Respuestas HTTP (webhooks)

Devuelve el shape `APIGatewayProxyResultV2` a mano (`{ statusCode, headers, body: JSON.stringify(...) }`), como en `ping.ts`. No hay helpers HTTP compartidos en el paquete; si repites el patrón en varios webhooks, extrae los tuyos a un `shared/` local.

### Consumidores async (SQS) — patrón para la fase de eventos (ver `ROADMAP.md`)

Cuando se active la mensajería (hoy **diferida**, sin infra de eventos): handler `SQSEvent → SQSBatchResponse`,
iterar `event.Records`, **idempotencia** (re-crear tabla `processed_events` + repo, chequear `event.id`),
y devolver `batchItemFailures` para reintento parcial → DLQ. Ver `ROADMAP.md` (Fase eventos).

## Cómo agregar un handler nuevo

1. Crear `src/handlers/<dominio>/<accion>.ts` con `export const handler = instrumentHandler(...)`.
2. Cablearlo en infra (no se "descubre" solo):
   - HTTP → [`infra/src/apis/main-api.ts`](../../infra/src/apis/main-api.ts):
     `api.route("POST /webhooks/stripe", { handler: "apps/functions/src/handlers/webhooks/stripe.handler", link: [database, secrets.StripeSecretKey] })`
     (el string es **ruta del archivo + nombre del export `handler`**).
   - Cola/bus → `queue.subscribe("apps/functions/src/handlers/<dominio>/<accion>.handler")` (fase de eventos, diferida — ver `ROADMAP.md`).
3. `pnpm --filter @todo-list-poc-infra/functions type-check && pnpm --filter @todo-list-poc-infra/functions lint`.

## Comandos

```bash
pnpm --filter @todo-list-poc-infra/functions type-check   # tsc --noEmit
pnpm --filter @todo-list-poc-infra/functions lint         # eslint src
pnpm sst dev --stage <usuario>            # corre las Lambdas en vivo (desde la raíz)
```

No hay script `build`: SST **bundlea con esbuild** en `sst dev`/`sst deploy` (tsconfig extiende
`tsconfig.node.json` con `types: ["node","aws-lambda"]`).

## Anti-patterns (no hacer)

- ❌ `console.log` o loggers caseros → usar `@todo-list-poc-infra/observability` (`createPowertoolsLogger`). *(Por esto se removió `shared/logger.ts`.)*
- ❌ Extraer/propagar el `correlationId` a mano → ya lo hace `instrumentHandler` / `getCorrelationId()` de observability. *(Por esto se removió `shared/middleware.ts`.)*
- ❌ CRUDs o lógica síncrona user-facing aquí → van en NestJS/ECS (§4.1).
- ❌ Hardcodear connection strings / secrets → usar `link:` en infra + env vars (`process.env.DATABASE_URL`).
- ❌ Handler sin `instrumentHandler` → pierdes logging estructurado y correlación.
- ❌ Meter lógica de negocio rica aquí → va en `@todo-list-poc-infra/core` (puro); el handler solo orquesta (parse → core → respuesta).

## See also

- [`AGENTS.md` raíz](../../AGENTS.md) — stack, estructura y comandos del monorepo.
- `@todo-list-poc-infra/observability` — `instrumentHandler`, `createPowertoolsLogger`, correlación.
- [`infra/src/apis/main-api.ts`](../../infra/src/apis/main-api.ts) — cableado de rutas/links.
- [`ROADMAP.md`](../../ROADMAP.md) — Fase eventos (EventBridge + SQS + DLQ).
