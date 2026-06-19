import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { instrumentHandler, createPowertoolsLogger } from "@todo-list-poc-infra/observability";

/**
 * Health check / smoke test.
 *
 * Endpoint: GET /ping
 * Respuesta: 200 { ok: true, stage, timestamp }
 *
 * Envuelto en `instrumentHandler` → extrae correlationId, loggea start/end/error
 * y propaga el contexto vía AsyncLocalStorage. Patrón estándar para toda Lambda.
 */
const logger = createPowertoolsLogger({
  service: "functions",
  stage: process.env.SST_STAGE ?? "unknown",
});

export const handler = instrumentHandler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>(
  async () => {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        stage: process.env.SST_STAGE ?? "unknown",
        timestamp: new Date().toISOString(),
      }),
    };
  },
  { logger },
);
