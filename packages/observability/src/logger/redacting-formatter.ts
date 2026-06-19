import { LogFormatter, LogItem } from "@aws-lambda-powertools/logger";
import type { LogAttributes, UnformattedAttributes } from "@aws-lambda-powertools/logger/types";
import { DEFAULT_REDACT_KEYS, redactObject } from "./redactor";

export interface RedactingFormatterOptions {
  /** Orden de claves en la salida (equivalente a `logRecordOrder` del Logger). */
  logRecordOrder?: string[];
  /** Claves a redactar (case-insensitive). Por defecto `DEFAULT_REDACT_KEYS`. */
  redactKeys?: readonly string[];
}

/**
 * LogFormatter de Powertools que replica el formato por defecto pero deep-redacta los
 * atributos adicionales (persistentKeys + datos por-llamada), que es donde realmente
 * aterrizan los secretos como campos estructurados.
 *
 * Existe porque el `Logger` de Powertools NO tiene redacción nativa de claves (a
 * diferencia de la opción `redact` de Pino). Sin esto, la garantía PII documentada en
 * `@app/observability` sería falsa en toda la ruta Lambda. `logFormatter` y
 * `logRecordOrder` son mutuamente excluyentes en el Logger, así que el orden se aplica
 * aquí (misma lógica que `PowertoolsLogFormatter`).
 */
export class RedactingLogFormatter extends LogFormatter {
  readonly #logRecordOrder?: string[];
  readonly #redactKeys: readonly string[];

  constructor(options?: RedactingFormatterOptions) {
    super();
    this.#logRecordOrder = options?.logRecordOrder;
    this.#redactKeys = options?.redactKeys ?? DEFAULT_REDACT_KEYS;
  }

  formatAttributes(
    attributes: UnformattedAttributes,
    additionalLogAttributes: LogAttributes,
  ): LogItem {
    const safeAdditional = redactObject(additionalLogAttributes, this.#redactKeys);

    const baseAttributes: LogAttributes = {
      level: attributes.logLevel,
      message: attributes.message,
      timestamp: this.formatTimestamp(attributes.timestamp),
      service: attributes.serviceName,
      cold_start: attributes.lambdaContext?.coldStart,
      function_arn: attributes.lambdaContext?.invokedFunctionArn,
      function_memory_size: attributes.lambdaContext?.memoryLimitInMB,
      function_name: attributes.lambdaContext?.functionName,
      function_request_id: attributes.lambdaContext?.awsRequestId,
      sampling_rate: attributes.sampleRateValue,
      xray_trace_id: attributes.xRayTraceId,
    };

    if (this.#logRecordOrder === undefined) {
      return new LogItem({ attributes: baseAttributes }).addAttributes(safeAdditional);
    }

    const ordered: LogAttributes = {};
    for (const key of this.#logRecordOrder) {
      if (key in baseAttributes && !(key in ordered)) ordered[key] = baseAttributes[key];
      else if (key in safeAdditional && !(key in ordered)) ordered[key] = safeAdditional[key];
    }
    for (const key in baseAttributes) {
      if (!(key in ordered)) ordered[key] = baseAttributes[key];
    }
    for (const key in safeAdditional) {
      if (!(key in ordered)) ordered[key] = safeAdditional[key];
    }

    return new LogItem({ attributes: ordered });
  }
}
