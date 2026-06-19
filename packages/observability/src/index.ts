/**
 * @todo-list-poc-infra/observability
 *
 * Logging y correlación de requests para todo runtime (Lambda, ECS/NestJS, Next.js).
 *
 * Reglas:
 * - Lambdas usan `createPowertoolsLogger` envuelto en `instrumentHandler`.
 * - ECS/NestJS/Next.js usan `createPinoLogger`.
 * - El correlationId se propaga vía AsyncLocalStorage; cliente HTTP debe leerlo
 *   con `getCorrelationId()` e inyectarlo con `injectCorrelationHeader`.
 */

export * from "./logger/pino-factory";
export * from "./logger/powertools-factory";
export * from "./logger/redacting-formatter";
export { DEFAULT_REDACT_KEYS, PINO_REDACT_PATHS, REDACTED, redactObject } from "./logger/redactor";
export * from "./correlation/context";
export * from "./correlation/headers";
export * from "./middleware/lambda-handler";
