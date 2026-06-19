import type { LoggerService } from "@nestjs/common";
import { createPinoLogger } from "@todo-list-poc-infra/observability";

/**
 * Adaptador de Pino (@todo-list-poc-infra/observability) a la interfaz `LoggerService` de NestJS.
 * Se registra en `main.ts` vía `app.useLogger(new PinoLoggerService())`.
 *
 * Mantiene el formato JSON estructurado + redactor PII del package compartido,
 * en lugar del logger por defecto de Nest.
 */
export class PinoLoggerService implements LoggerService {
  private readonly logger = createPinoLogger({
    service: "example-service",
    stage: process.env.SST_STAGE ?? process.env.NODE_ENV ?? "local",
  });

  log(message: unknown, ...optional: unknown[]): void {
    this.logger.info({ optional }, String(message));
  }

  error(message: unknown, ...optional: unknown[]): void {
    this.logger.error({ optional }, String(message));
  }

  warn(message: unknown, ...optional: unknown[]): void {
    this.logger.warn({ optional }, String(message));
  }

  debug(message: unknown, ...optional: unknown[]): void {
    this.logger.debug({ optional }, String(message));
  }

  verbose(message: unknown, ...optional: unknown[]): void {
    this.logger.trace({ optional }, String(message));
  }
}
