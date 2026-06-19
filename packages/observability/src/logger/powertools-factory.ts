import { Logger } from "@aws-lambda-powertools/logger";
import { DEFAULT_REDACT_KEYS } from "./redactor";
import { RedactingLogFormatter } from "./redacting-formatter";

export interface PowertoolsFactoryOptions {
  service: string;
  stage: string;
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  persistentAttributes?: Record<string, unknown>;
}

export function createPowertoolsLogger(opts: PowertoolsFactoryOptions): Logger {
  return new Logger({
    serviceName: opts.service,
    logLevel: opts.level ?? (process.env.LOG_LEVEL as "INFO") ?? "INFO",
    persistentKeys: {
      stage: opts.stage,
      ...opts.persistentAttributes,
    },
    // Powertools no redacta claves de forma nativa → formatter propio que deep-redacta
    // los atributos. `logFormatter` reemplaza a `logRecordOrder` (son excluyentes).
    logFormatter: new RedactingLogFormatter({
      logRecordOrder: ["level", "timestamp", "service", "stage", "message", "correlationId"],
      redactKeys: DEFAULT_REDACT_KEYS,
    }),
    sampleRateValue: opts.stage === "prod" ? 0.1 : 0,
  });
}
