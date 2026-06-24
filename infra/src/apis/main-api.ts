/**
 * Main API — API Gateway HTTP API. Única superficie pública del stack.
 *
 * Routing:
 *   GET /ping          → Lambda handlers/health/ping  (smoke test)
 *   ANY /api/{proxy+}  → NestJS (ECS) vía VPC Link + Cloud Map  (CRUD principal)
 *
 * Sin ALB: el gateway alcanza el servicio NestJS por integración privada
 * (`routePrivate`) usando el registro Cloud Map del service. Para ello el API
 * debe estar en la MISMA VPC que el servicio (param `vpc` → crea el VPC link).
 *
 * Rutas Lambda con links a recursos:
 *   api.route("POST /webhooks/stripe", {
 *     handler: "apps/functions/src/handlers/webhooks/stripe.handler",
 *     link: [database, secrets.StripeSecretKey],
 *   });
 */

import { vpc } from "../networking/vpc";
import { todoService } from "../services/workers";
import { getLogRetention } from "../helpers/stage";

// Retención de logs stage-aware aplicada a TODA ruta Lambda del API (transform.route.handler).
export const api = new sst.aws.ApiGatewayV2("MainApi", {
  vpc,
  transform: {
    route: {
      handler: (args) => {
        args.logging = { retention: getLogRetention($app.stage) };
      },
    },
  },
});

// Health check / smoke test — Lambda (no requiere VPC ni acceso a BD).
api.route("GET /ping", {
  handler: "apps/functions/src/handlers/health/ping.handler",
});

// CRUD principal → NestJS en ECS, vía integración privada (Cloud Map).
// `nodes.cloudmapService` no existe en modo `sst dev` (el servicio corre local),
// así que la ruta privada solo se cablea en stages desplegados.
if (!$dev) {
  api.routePrivate("ANY /api/{proxy+}", todoService.nodes.cloudmapService.arn);
}

// Export para que otros módulos (web frontend, etc.) referencien la URL.
export const apiUrl = api.url;
