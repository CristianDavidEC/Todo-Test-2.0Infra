<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@app/observability`

Logging estructurado + propagación de `correlationId`. Multi-runtime.
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- Dos loggers según destino: **Powertools** (Lambda) / **Pino** (ECS, NestJS, Next.js). Ambos son **deps normales** (no peer).
- Consumido por `apps/functions` (ping) y `apps/services/example-service` (`PinoLoggerService`).

## Estructura

```
src/
  logger/{powertools-factory,pino-factory,redactor,redacting-formatter}.ts
  correlation/{context,headers}.ts
  middleware/lambda-handler.ts        → instrumentHandler
```

## Patrones

1. **Elige el logger por runtime.** `createPowertoolsLogger({service,stage})` en Lambda (sampling 10% en prod). `createPinoLogger({service,stage})` en el resto (pretty en dev, JSON en prod). No los mezcles.
2. **`correlationId` vía `AsyncLocalStorage`** — nunca lo pases a mano. `runWithCorrelation(ctx, fn)` en el punto de entrada; `getCorrelationId()` para leerlo aguas abajo (devuelve `undefined` fuera de contexto — manéjalo). En **ECS/NestJS/Next.js** la propagación NO es automática: `createPinoLogger` lleva un `mixin` que inyecta `correlationId`/`userId` (del store) en cada línea, pero requiere que la app **ancle la request**. El package provee las primitivas (`runWithCorrelation`/mixin para ECS, `instrumentHandler` para Lambda); el `correlationMiddleware` de NestJS lo provee la **APP** (`apps/services/example-service/src/logging/correlation.middleware.ts`, `app.use(...)` en `main.ts`), no este package. **Sin ese middleware los logs del servicio no llevan correlationId** (el equivalente ECS de "sin `instrumentHandler`").
3. **HTTP saliente DEBE propagar el id:** `injectCorrelationHeader(headers, getCorrelationId())` antes de despachar (devuelve un objeto **nuevo**, spread-éalo).
4. **Lambdas pasan por `instrumentHandler(handler, { logger })`** — extrae correlation + `requestId`, loguea `handler.start`/`end`/error con `durationMs`, y limpia las keys en `finally`. **Sin él, el correlation se pierde** aguas abajo.
5. **Redacción automática** de secretos (password, token, authorization, etc.), con **paridad real entre runtimes**: Pino combina su `redact` nativo (`PINO_REDACT_PATHS`, rápido pero de profundidad fija) **+** un hook `formatters.log` que pasa cada objeto por `redactObject` → redacción por-clave a CUALQUIER profundidad (recursiva). Powertools **NO** tiene redacción nativa, así que la ruta Lambda usa un `RedactingLogFormatter` propio que deep-redacta los atributos con el mismo `redactObject` (`DEFAULT_REDACT_KEYS`). Ambas rutas comparten la lista de claves y el mismo comportamiento recursivo.

## Gotchas

- `getCorrelationId()` → `undefined` fuera de un `runWithCorrelation`.
- Sampling de Powertools fijo (10% prod / 0%); no hay override en el factory. **El 10% se activa solo si `stage === "prod"`**, así que verifica que el stage real llegue al runtime (en Lambda `SST_STAGE` puede no estar inyectada — pásalo explícito, p.ej. `APP_STAGE`); con un stage erróneo nunca se samplea.
- `setUserId()` es no-op si no hay contexto activo; el `Auth0Guard` ya lo llama tras el upsert → los logs posteriores llevan `userId`.

## Receta

- **Nuevo handler Lambda** → `const logger = createPowertoolsLogger({…}); export const handler = instrumentHandler(impl, { logger })`.
- **Cliente HTTP** → inyecta el header con `injectCorrelationHeader` antes de cada call.
