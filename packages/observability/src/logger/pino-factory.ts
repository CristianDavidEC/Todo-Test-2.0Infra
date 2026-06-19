import pino, { type Logger, type LoggerOptions } from "pino";
import { PINO_REDACT_PATHS, redactObject } from "./redactor";
import { getCorrelationContext } from "../correlation/context";

export interface PinoFactoryOptions {
  service: string;
  stage: string;
  level?: pino.Level;
  pretty?: boolean;
  base?: Record<string, unknown>;
}

export function createPinoLogger(opts: PinoFactoryOptions): Logger {
  const isLocal = opts.pretty ?? process.env.NODE_ENV !== "production";

  const options: LoggerOptions = {
    level: opts.level ?? (process.env.LOG_LEVEL as pino.Level) ?? "info",
    base: {
      service: opts.service,
      stage: opts.stage,
      ...opts.base,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // `redact` nativo cubre rutas conocidas (rápido, incl. bracket-paths de headers).
    // No es recursivo (profundidad fija), así que añadimos `formatters.log` con
    // `redactObject` para garantizar redacción por-clave a CUALQUIER profundidad —
    // paridad real con el path de Powertools (RedactingLogFormatter).
    redact: {
      paths: PINO_REDACT_PATHS,
      censor: "[REDACTED]",
    },
    // Enriquecimiento por-línea desde el AsyncLocalStorage de correlación: cada log
    // lleva correlationId (y userId si lo pobló el guard) sin pasarlo manualmente.
    // Es lo que hace que la correlación funcione en ECS/NestJS/Next.js, no solo Lambda.
    mixin() {
      const ctx = getCorrelationContext();
      if (!ctx) return {};
      return ctx.userId
        ? { correlationId: ctx.correlationId, userId: ctx.userId }
        : { correlationId: ctx.correlationId };
    },
    formatters: {
      level: (label) => ({ level: label }),
      log: (obj) => redactObject(obj),
    },
  };

  if (isLocal) {
    return pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, singleLine: true },
      },
    });
  }

  return pino(options);
}
