import type { Request, Response, NextFunction } from "express";
import { CORRELATION_HEADER, extractCorrelationId, runWithCorrelation } from "@app/observability";

/**
 * Ancla cada request HTTP en el AsyncLocalStorage de correlación de `@app/observability`.
 *
 * Se registra como middleware global de Express en `main.ts` (`app.use(...)`), antes del
 * router de Nest, para que TODO el ciclo de la request (guards, controllers, services,
 * el logger Pino vía su `mixin`, y cualquier llamada HTTP saliente) comparta el mismo
 * `correlationId`. Es lo que hace real la correlación cross-service que la plantilla
 * promete; sin esto los logs del servicio no llevan correlationId.
 *
 * Toma el `x-correlation-id` entrante si existe (propagado desde el front / otro servicio)
 * o genera uno nuevo, y lo devuelve en la respuesta para trazabilidad.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = extractCorrelationId(req.headers);
  res.setHeader(CORRELATION_HEADER, correlationId);
  runWithCorrelation({ correlationId }, () => next());
}
