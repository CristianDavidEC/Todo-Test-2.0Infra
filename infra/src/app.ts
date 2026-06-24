/**
 * Orquestador de infraestructura.
 * Importa todos los módulos de recursos en el orden correcto.
 * Recursos base primero, dependientes después.
 *
 * Este archivo es llamado desde sst.config.ts → run()
 *
 * Estado actual (activo): networking (VPC) + secrets + Neon + ECS (NestJS) +
 * API Gateway (Lambda /ping + NestJS privado /api/*) + Next.js web.
 * Pendiente (TODO): storage (buckets) y eventos (colas).
 * No incluido (receta por proyecto): datastore MongoDB documental — ver packages/db/AGENTS.md.
 */

// 1. Networking y base (creados primero, otros dependen)
import { vpc } from "./networking/vpc";
import "./shared/secrets";

// 2. Bases de datos (independiente de cómputo, depende de secrets/networking)
import { neonDb } from "./databases/neon";
import "./databases/migrate"; // drizzle-kit migrate auto en cada deploy (tras crear Neon)

// 3. Storage / 4. Eventos → ver infra/src/{storage,events}/ + ROADMAP.md

// 5. Cómputo
import "./services/workers"; // ECS NestJS service (Cloud Map)
import { apiUrl } from "./apis/main-api"; // API Gateway: GET /ping (Lambda) + ANY /api/* (NestJS privado)

// 6. Frontend (Next.js deploy)
import { web } from "./webs/web";

/**
 * Outputs del stack — los imprime `sst deploy` y los devuelve `run()`.
 * Necesarios para el bootstrap: tras `sst deploy --stage dev`, capturar
 * `neonProjectId` → NEON_DEV_PROJECT_ID y `vpcId` → SHARED_DEV_VPC_ID en .env.
 */
export const outputs = {
  vpcId: vpc.id,
  neonProjectId: neonDb.id,
  apiUrl,
  webUrl: web.url,
};
