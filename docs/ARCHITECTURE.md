# Arquitectura — base-apps (plantilla v2.0)

Índice de la documentación humana. El arranque rápido y los comandos están en el
[README](../README.md) (raíz) y, en detalle, en
[08-desarrollo-local.md](08-desarrollo-local.md). El trabajo futuro está en
[ROADMAP.md](../ROADMAP.md). Cada carpeta tiene además su `AGENTS.md` para agentes IA.

## Índice de documentación

| #  | Sección | Contenido |
|----|---------|-----------|
| 01 | [Visión General](01-vision-general.md) | Qué es, decisiones de diseño, entornos, prerequisitos |
| 02 | [Estructura del Proyecto](02-estructura-proyecto.md) | Árbol de carpetas canónico |
| 03 | [Configuración Raíz](03-configuracion-raiz.md) | `package.json`, `pnpm-workspace`, `turbo.json`, grafo de deps |
| 04 | [Configuraciones Compartidas](04-configuraciones-compartidas.md) | `@app/config`: presets TypeScript/ESLint/Vitest |
| 05 | [Paquetes Compartidos](05-paquetes-compartidos.md) | `types`, `core`, `db`, `auth`, `observability` |
| 06 | [Aplicaciones](06-aplicaciones.md) | `apps/web`, `apps/functions`, `apps/services` (patrones) |
| 07 | [Infraestructura SST](07-infraestructura-sst.md) | `infra/`, entornos, recursos compartidos vs aislados |
| 08 | [Desarrollo Local y Servicios](08-desarrollo-local.md) | Quickstart, comandos, servicios NestJS (local/SST/Docker) |

**Empieza aquí:** [SETUP-ONBOARDING](SETUP-ONBOARDING.md) (guía de inicio del desarrollador).
**Setup operativo (one-time):** [SETUP-AWS](SETUP-AWS.md) · [SETUP-NEON](SETUP-NEON.md) · [SETUP-AUTH0](SETUP-AUTH0.md).

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Monorepo | Turborepo + pnpm |
| IaC | SST v4 (Ion) / Pulumi · `us-east-1` |
| Frontend | Next.js 16 + React 19 (App Router) — `apps/web` |
| API síncrona | NestJS 11 en ECS Fargate — `apps/services/example-service` |
| Async / eventos | AWS Lambda (TypeScript, sin framework) — `apps/functions` |
| Tipos compartidos | `@app/types` (Zod source-of-truth + tipos inferidos) |
| Lógica de negocio | `@app/core` (puro, sin deps AWS/SST/Auth0) |
| Base de datos | `@app/db` (Postgres vía Neon + Drizzle) |
| Autenticación | `@app/auth` (Auth0: JWT/JWKS, upsert lazy, RBAC por claims) |
| Observabilidad | `@app/observability` (Powertools/Pino + `correlationId`) |
| Configuración | `@app/config` (tsconfig + eslint + vitest centralizados) |

**Networking:** VPC con NAT *instance* `t4g.nano` (no NAT Gateway). API Gateway → NestJS por
VPC Link + Cloud Map (sin ALB). Lambdas fuera de VPC.
