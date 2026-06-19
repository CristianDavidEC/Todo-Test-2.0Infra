# Base-Projects-SST — Plantilla base v2.0

Plantilla base de la que nacen los proyectos nuevos de la empresa sobre AWS. Monorepo
Turborepo + pnpm con infraestructura como código en **SST v4 (Ion)**.

<!-- CI/CD: cambio de prueba para validar el workflow pr-checks. -->

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm (workspaces `@app/*`) |
| IaC | SST v4 (Ion) + Pulumi, región `us-east-1` |
| Frontend | Next.js 16 (App Router, React 19, Tailwind 4) — `apps/web` |
| API síncrona | NestJS 11 en ECS Fargate — `apps/services/example-service` |
| Async / eventos | AWS Lambda (TS, sin framework) — `apps/functions` |
| Base de datos | Neon (Postgres serverless) + Drizzle — `@app/db` |
| Auth | Auth0 (verificación JWT vía JWKS) — `@app/auth` |
| Observabilidad | Powertools (Lambda) + Pino (ECS/Next) — `@app/observability` |

**Networking:** VPC con NAT *instance* `t4g.nano` (no NAT Gateway). API Gateway → NestJS por
VPC Link + Cloud Map (**sin ALB**). Lambdas fuera de VPC.

## Requisitos

- Node.js **22** (ver `.nvmrc`) · pnpm `9.15.4` (pineado en `packageManager`)
- Cuenta AWS con perfil SSO · cuenta Neon · (opcional) tenant Auth0

## Arranque rápido

👉 **¿Primera vez? Empieza por la guía de onboarding:** [docs/SETUP-ONBOARDING.md](docs/SETUP-ONBOARDING.md)
— de cero a corriendo, paso a paso (distingue el bootstrap inicial del proyecto del
onboarding de un dev nuevo).

Resumen:

```bash
nvm use                 # Node 22
pnpm install
cp .env.example .env     # rellena las variables ANTES del primer deploy
pnpm run type-check      # verifica el monorepo
pnpm sst dev --stage <tu-usuario>     # stage personal (branch Neon propia + VPC de dev)
```

**Bootstrap del proyecto (1 vez):** el primer `sst deploy --stage dev` crea la VPC y el
proyecto Neon compartidos; sus IDs salen en los **outputs** del deploy (`vpcId`,
`neonProjectId`). Cópialos a `.env` como `SHARED_DEV_VPC_ID` y `NEON_DEV_PROJECT_ID`.

## Comandos

```bash
pnpm run build | type-check | lint | test     # turbo, todo el monorepo
pnpm --filter @app/web dev                     # un paquete concreto
pnpm --filter @app/db db:generate|db:migrate   # migraciones Drizzle
pnpm sst deploy --stage dev|staging|prod
pnpm sst secret set <KEY> <value> --stage <stage>
```

## Documentación

- **Empieza aquí:** [docs/SETUP-ONBOARDING.md](docs/SETUP-ONBOARDING.md) — guía de inicio del desarrollador.
- **Para humanos:** [docs/](docs/) — índice en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Para agentes IA:** un `AGENTS.md` por carpeta (raíz + cada app/package/infra). Léelo
  **antes** de editar esa carpeta. `CLAUDE.md` (raíz) enruta a todos.
- **Pendiente / futuro:** [ROADMAP.md](ROADMAP.md).
