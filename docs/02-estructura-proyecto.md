# Estructura del Proyecto

Este documento es la **fuente canónica** del árbol de carpetas del monorepo. Si otro doc lo contradice, manda este.

```
Base-Projects-SST/
├── apps/
│   ├── web/                          # Frontend Next.js 16 (App Router, React 19)
│   ├── functions/                    # Lambda handlers (TypeScript nativo, sin framework)
│   │   ├── src/
│   │   │   └── handlers/             # Handlers por dominio: <dominio>/<accion>.ts
│   │   │       └── health/
│   │   │           └── ping.ts
│   │   ├── package.json              # Dependencias de TODAS las lambdas
│   │   └── tsconfig.json
│   └── services/                     # Servicios Fargate (NestJS), uno por carpeta
│       └── example-service/          # Servicio de referencia
│           ├── src/
│           │   ├── main.ts
│           │   ├── app.module.ts
│           │   ├── modules/          # Módulos de dominio (p. ej. users)
│           │   ├── auth/             # Glue de @app/auth para NestJS
│           │   ├── db/               # Glue de @app/db para el servicio
│           │   └── logging/          # Glue de @app/observability (Pino)
│           ├── Dockerfile            # node:22-alpine, non-root, tini, HEALTHCHECK
│           ├── package.json
│           └── tsconfig.json
│
├── infra/                            # Infraestructura SST v4 (transversal)
│   ├── src/
│   │   ├── app.ts                    # Orquestador: importa los recursos en orden de fase
│   │   ├── apis/                     # API Gateway + rutas (main-api.ts)
│   │   ├── databases/                # neon.ts (Neon Postgres)
│   │   ├── events/                   # queues.ts (vacío — patrón EventBridge+SQS pendiente)
│   │   ├── helpers/                  # stage.ts (clasificación/retención por stage), env.ts
│   │   ├── networking/               # vpc.ts (VPC + NAT instance t4g.nano)
│   │   ├── services/                 # workers.ts (ECS/Fargate vía Cloud Map)
│   │   ├── shared/                   # secrets.ts (manifest), tags.ts (tags globales)
│   │   ├── storage/                  # buckets.ts (vacío — S3 pendiente)
│   │   ├── webs/                     # web.ts (Next.js en AWS)
│   │   └── sst-globals.d.ts
│   ├── package.json
│   └── tsconfig.json
│
├── packages/                         # Código compartido entre apps (namespace @app/*)
│   ├── config/                       # Presets tsconfig + eslint + vitest (@app/config)
│   ├── types/                        # Schemas Zod + tipos inferidos (@app/types)
│   ├── core/                         # Lógica de negocio pura, sin AWS (@app/core)
│   ├── db/                           # Acceso a datos Postgres (Drizzle) (@app/db)
│   ├── auth/                         # Autenticación Auth0 multi-runtime (@app/auth)
│   └── observability/                # Logging + correlationId (@app/observability)
│
├── .github/                          # CI/CD: branch-per-environment + OIDC (ver docs/SETUP-CICD.md)
│   ├── workflows/                    # pr-checks + deploy-dev/staging/prod
│   └── actions/setup/                # Composite action de setup (Node + pnpm + deps)
├── docs/                             # Documentación detallada del proyecto
├── sst.config.ts                     # Entry point de SST (delega en infra/src/app.ts)
├── turbo.json                        # Pipeline de tareas de Turborepo
├── pnpm-workspace.yaml               # Definición de workspaces
├── package.json                      # Package raíz del monorepo
├── docker-compose.yml                # Servicios para desarrollo local
├── .nvmrc                            # Node 22
├── AGENTS.md                         # Onboarding canónico
└── ROADMAP.md                        # Lo que la base deja fuera a propósito
```

## Descripción de cada directorio

| Directorio | Propósito |
|------------|-----------|
| `apps/web/` | Aplicación frontend Next.js 16 con App Router (React 19, Tailwind 4). |
| `apps/functions/` | Handlers Lambda en TypeScript nativo, organizados por dominio (`handlers/<dominio>/<accion>.ts`). Un solo `package.json` para todas las lambdas; esbuild (vía SST) bundlea cada handler independientemente. Las rutas se cablean en `infra/src/apis/main-api.ts`. |
| `apps/services/<nombre>/` | Servicios Fargate con NestJS 11. Cada servicio es un workspace independiente con su propio `Dockerfile`. Se cablean en `infra/src/services/workers.ts`. |
| `infra/` | Infraestructura SST v4 organizada por tipo de recurso. `src/app.ts` es el orquestador que importa cada módulo en orden de fase (networking → secrets → databases → storage → events → compute → frontend). |
| `packages/config/` | Presets centrales de TypeScript, ESLint y Vitest que extienden todas las apps y paquetes. Ver [04](./04-configuraciones-compartidas.md). |
| `packages/types/` | Schemas Zod (source of truth) y tipos inferidos con `z.infer`, compartidos entre frontend y backend. |
| `packages/core/` | Lógica de negocio pura. No importa `aws-sdk`, `@aws-sdk/*`, `aws-lambda`, `sst` ni `@auth0/*`. Usable en web, Lambdas y servicios. |
| `packages/db/` | Acceso a datos Postgres con Drizzle (`adapters/postgresql/`). `getPostgresClient()` autodetecta runtime (Neon HTTP en Lambda, `pg` TCP en ECS). Schema en `adapters/postgresql/schema.ts`; migraciones con drizzle-kit. |
| `packages/auth/` | Autenticación Auth0-only multi-runtime (Lambda / NestJS / Next.js vía subpath `/nextjs`). Verificación de JWT vía JWKS público + upsert lazy del usuario. Deps de plataforma como peerDependencies opcionales (incluido `@app/db` type-only). |
| `packages/observability/` | Logging estructurado: Powertools (Lambda) y Pino (ECS / NestJS / Next.js), con redacción de secretos y propagación de `correlationId` vía `AsyncLocalStorage`. |
| `docs/` | Documentación detallada del proyecto, organizada por tema. |
| `.github/` | CI/CD: workflows branch-per-environment + OIDC (deploy dev/staging/prod). Ver [`docs/SETUP-CICD.md`](./SETUP-CICD.md). |

> **Nota:** carpetas como `events/queues.ts` y `storage/buckets.ts` existen pero están **vacías** (placeholders); su implementación es trabajo por-proyecto descrito en [`ROADMAP.md`](../ROADMAP.md). La base **no** incluye datastore MongoDB ni tablas RBAC `roles`/`user_roles` — las recetas para reañadirlos viven en `packages/db/AGENTS.md`.
