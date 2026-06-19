/**
 * Services — Fargate (ECS) vía SST.
 *
 * `example-service` (NestJS) es la API principal de CRUDs síncronos (regla de la base:
 * ECS por defecto, Lambda solo async). Se expone a través del API Gateway vía
 * VPC Link + Cloud Map (sin ALB — ver apis/main-api.ts). El `serviceRegistry`
 * crea el registro Cloud Map necesario para esa integración privada.
 *
 * En `sst dev` el servicio corre local (`pnpm dev`); el Cloud Map / VPC link solo
 * aplican en stages desplegados (`sst deploy`).
 */

import { vpc } from "../networking/vpc";
import { databaseUrl } from "../databases/neon";
import { getEcsTaskSize, getEcsTaskCount, getLogRetention } from "../helpers/stage";
import { requireSharedEnv } from "../helpers/env";

const stage = $app.stage;
const taskSize = getEcsTaskSize(stage);
const taskCount = getEcsTaskCount(stage);
const logRetention = getLogRetention(stage);

export const cluster = new sst.aws.Cluster("MainCluster", { vpc });

export const exampleService = cluster.addService("ExampleService", {
  image: {
    dockerfile: "apps/services/example-service/Dockerfile",
    context: ".",
  },
  // Registro Cloud Map (puerto del contenedor NestJS) — requerido para el
  // VPC link del API Gateway. Sin `loadBalancer` (no ALB).
  serviceRegistry: { port: 3001 },
  cpu: taskSize.cpu,
  memory: taskSize.memory,
  scaling: { min: taskCount.min, max: taskCount.max },
  // Retención de logs stage-aware (personales/dev expiran antes que prod).
  logging: { retention: logRetention },
  // Health check ejecutado por ECS (no hay ALB que lo haga). Si NestJS se cuelga
  // sin crashear, ECS marca la task unhealthy y la reemplaza en vez de seguir
  // enrutando tráfico vía Cloud Map. Pega al endpoint /api/health del propio service.
  health: {
    command: ["CMD-SHELL", "wget -q --spider http://localhost:3001/api/health || exit 1"],
    startPeriod: "30 seconds",
    interval: "30 seconds",
    timeout: "5 seconds",
    retries: 3,
  },
  environment: {
    DATABASE_URL: databaseUrl,
    APP_STAGE: stage,
    // Config Auth0: en stages compartidos fail-fast si falta (ver helpers/env.ts);
    // en personales puede faltar (auth opcional en local).
    AUTH0_DOMAIN: requireSharedEnv("AUTH0_DOMAIN"),
    AUTH0_AUDIENCE: requireSharedEnv("AUTH0_AUDIENCE"),
    AUTH0_NAMESPACE: process.env.AUTH0_NAMESPACE ?? "https://app.example.com/",
  },
  // En dev corre local con live-reload en lugar de buildear la imagen.
  dev: {
    command: "pnpm dev",
    directory: "apps/services/example-service",
  },
});
