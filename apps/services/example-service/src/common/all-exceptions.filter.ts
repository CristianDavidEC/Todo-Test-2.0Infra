import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";

/**
 * Filtro de excepciones global. Estandariza el cuerpo de error de TODO el servicio
 * y evita filtrar detalles internos al cliente. Lo que cada proyecto clonado
 * heredaría sin tener que reinventarlo:
 *
 *   - ZodError                     → 400 { issues }       (validación en el borde)
 *   - Violación de unique (23505)  → 409                  (en vez de un 500 crudo)
 *   - HttpException de Nest        → su status/mensaje
 *   - cualquier otra cosa          → 500 genérico         (sin exponer el error real)
 *
 * Se registra en main.ts con `app.useGlobalFilters(new AllExceptionsFilter())`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ZodError) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Validation failed",
        issues: exception.flatten(),
      });
      return;
    }

    if (isUniqueViolation(exception)) {
      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: "Resource already exists",
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json(
        typeof exception.getResponse() === "string"
          ? { statusCode: status, message: exception.getResponse() }
          : exception.getResponse(),
      );
      return;
    }

    // Desconocido: log interno completo, respuesta genérica al cliente (sin leak).
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  }
}

/** Detecta una violación de constraint UNIQUE de Postgres (SQLSTATE 23505). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
