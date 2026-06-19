/**
 * Neon (Postgres serverless) — BD principal de la plantilla.
 *
 * Estrategia híbrida (ver docs/SETUP-NEON.md):
 *
 *   prod      → proyecto Neon propio (todo-list-poc-infra-prod), aislado
 *   staging   → proyecto Neon propio (todo-list-poc-infra-staging), aislado
 *   dev       → proyecto Neon compartido (todo-list-poc-infra-dev), main branch
 *   personal  → branch en el proyecto 'dev' (copy-on-write)
 *
 * Por qué híbrida: aislamiento total de prod/staging + sharing de seed canónico
 * entre devs vía branches del proyecto dev.
 *
 * Bootstrap (1 vez por proyecto base):
 *   1. Crear org en Neon (https://console.neon.tech)
 *   2. Generar NEON_API_KEY (organization-scoped)
 *   3. Anotar NEON_ORG_ID
 *   4. Setear ambos en .env local
 *   5. `pnpm sst add neon`  ← agrega el provider Neon a SST
 *   6. `pnpm sst deploy --stage dev`  ← crea el proyecto compartido
 *   7. Capturar NEON_DEV_PROJECT_ID del output → committed a .env.example
 *   8. Devs pueden hacer `pnpm sst dev --stage $USER` → branch auto
 *
 * Ver docs/SETUP-NEON.md para guía paso a paso.
 */

import { isProduction, isStaging, isPersonalStage } from "../helpers/stage";

const stage = $app.stage;

// Validación de env vars requeridos
const NEON_ORG_ID = process.env.NEON_ORG_ID;
if (!NEON_ORG_ID) {
  throw new Error(
    "NEON_ORG_ID env var requerido.\n" +
      "1. Crea una org en https://console.neon.tech\n" +
      "2. Copia el Organization ID desde Settings → General\n" +
      "3. Agrégalo a .env como NEON_ORG_ID=org-xxxx\n" +
      "4. Ver docs/SETUP-NEON.md para detalles."
  );
}

const COMMON_PROJECT_CONFIG = {
  orgId: NEON_ORG_ID,
  pgVersion: 17,
  regionId: "aws-us-east-1",
  // Free tier permite max 6h (21600s); Launch/Scale plans permiten más.
  // Si se upgrade el plan, subir este valor a 86400 (24h) o más.
  historyRetentionSeconds: 21600,
} as const;

/**
 * Connection string resultante para este stage.
 * Se inyecta a Lambdas/Services vía `link: [database]`.
 */
let connectionString: $util.Output<string>;
let neonResources: { kind: "project" | "branch"; id: $util.Output<string> };

if (isProduction(stage) || isStaging(stage)) {
  // -------- PROD / STAGING --------
  // Proyecto Neon propio por stage. Aislamiento total.
  const project = new neon.Project("DbProject", {
    ...COMMON_PROJECT_CONFIG,
    name: `${$app.name}-${stage}`,
  });

  connectionString = project.connectionUri;
  neonResources = { kind: "project", id: project.id };
} else if (stage === "dev") {
  // -------- DEV SHARED --------
  // Proyecto compartido que será parent de branches personales.
  const project = new neon.Project("DbProject", {
    ...COMMON_PROJECT_CONFIG,
    name: `${$app.name}-dev`,
  });

  connectionString = project.connectionUri;
  neonResources = { kind: "project", id: project.id };
} else if (isPersonalStage(stage)) {
  // -------- PERSONAL STAGE --------
  // Branch en el proyecto 'dev' compartido.
  const devProjectId = process.env.NEON_DEV_PROJECT_ID;
  if (!devProjectId) {
    throw new Error(
      `NEON_DEV_PROJECT_ID env var requerido para stages personales.\n` +
        `1. Asegúrate que el stage 'dev' fue deployado primero:\n` +
        `     pnpm sst deploy --stage dev\n` +
        `2. Captura el Project ID del output (o de Neon UI → Settings)\n` +
        `3. Agrégalo a .env.example y .env como:\n` +
        `     NEON_DEV_PROJECT_ID=proj-xxxxxxxxxxxxxxxx\n` +
        `4. Re-corre el comando.\n` +
        `Ver docs/SETUP-NEON.md §6.1 para más detalle.`
    );
  }

  // Referencia al proyecto dev existente (para obtener role/password/db por default)
  const devProject = neon.Project.get("DevProject", devProjectId);

  // Branch forked del main del proyecto dev (copy-on-write).
  // SST/Pulumi destruye automáticamente la branch al hacer `sst remove`.
  const branch = new neon.Branch("PersonalBranch", {
    projectId: devProjectId,
    name: stage,
  });

  // Endpoint compute para la branch (read_write).
  const endpoint = new neon.Endpoint("PersonalEndpoint", {
    projectId: devProjectId,
    branchId: branch.id,
    type: "read_write",
  });

  // Composición del connection string: credenciales del proyecto + host de la nueva branch.
  // Las branches Neon heredan el role/password/database del proyecto.
  connectionString = $interpolate`postgresql://${devProject.databaseUser}:${devProject.databasePassword}@${endpoint.host}/${devProject.databaseName}?sslmode=require`;
  neonResources = { kind: "branch", id: branch.id };
} else {
  throw new Error(`Stage no soportado en neon.ts: ${stage}`);
}

/**
 * Recurso linkable de SST.
 * Lambdas/Services lo consumen con `link: [database]` y acceden vía:
 *   import { Resource } from "sst";
 *   Resource.Database.connectionString
 */
export const database = new sst.Linkable("Database", {
  properties: {
    connectionString,
  },
});

/**
 * Connection string crudo (Output) para inyectar como env var `DATABASE_URL`
 * en servicios ECS / funciones (ver infra/src/services/workers.ts y apis/main-api.ts).
 * La capa de composición de cada app lee `process.env.DATABASE_URL`, manteniendo
 * `@todo-list-poc-infra/db` libre de SST.
 */
export const databaseUrl = connectionString;

/**
 * Recurso Neon de este stage (`{ kind, id }`). Útil como output del stack
 * (capturar el project id de dev → NEON_DEV_PROJECT_ID) y para scripts que
 * necesiten referenciar el recurso, no solo el connection string.
 */
export const neonDb = neonResources;
