# Todo List POC

Proyecto **Todo List POC** sobre AWS, partido de la plantilla base v2.0 de la empresa. Monorepo
Turborepo + pnpm con infraestructura como código en **SST v4 (Ion)**.

<!-- CI/CD: cambio de prueba para validar el workflow pr-checks. -->

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm (workspaces `@todo-list-poc-infra/*`) |
| IaC | SST v4 (Ion) + Pulumi, región `us-east-1` |
| Frontend | Next.js 16 (App Router, React 19, Tailwind 4) — `apps/web` |
| API síncrona | NestJS 11 en ECS Fargate — `apps/services/todo-service` |
| Async / eventos | AWS Lambda (TS, sin framework) — `apps/functions` |
| Base de datos | Neon (Postgres serverless) + Drizzle — `@todo-list-poc-infra/db` |
| Auth | Auth0 (verificación JWT vía JWKS) — `@todo-list-poc-infra/auth` |
| Observabilidad | Powertools (Lambda) + Pino (ECS/Next) — `@todo-list-poc-infra/observability` |

**Networking:** VPC con NAT *instance* `t4g.nano` (no NAT Gateway). API Gateway → NestJS por
VPC Link + Cloud Map (**sin ALB**). Lambdas fuera de VPC.

## Requisitos

- Node.js **22** (ver `.nvmrc`) · pnpm `9.15.4` (pineado en `packageManager`)
- Cuenta AWS con perfil SSO · cuenta Neon · (opcional) tenant Auth0

## Arranque rápido

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
pnpm --filter @todo-list-poc-infra/web dev                     # un paquete concreto
pnpm --filter @todo-list-poc-infra/db db:generate|db:migrate   # migraciones Drizzle
pnpm sst deploy --stage dev|staging|prod
pnpm sst secret set <KEY> <value> --stage <stage>
```

## Documentación

- **Definición funcional del producto:** [docs/DEFINICION-FUNCIONAL.md](docs/DEFINICION-FUNCIONAL.md) — módulos, modelo de dominio y orden de ejecución.
- **Para agentes IA y arquitectura:** un `AGENTS.md` por carpeta (raíz + cada app/package/infra). Léelo
  **antes** de editar esa carpeta. `CLAUDE.md` (raíz) enruta a todos.
