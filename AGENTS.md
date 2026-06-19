# AGENTS.md — todo-list-poc-infra

Proyecto **Todo List POC** (monorepo cloud-native), partido de la plantilla base v2.0 de la empresa. Stack: Turborepo + pnpm, SST (Ion, v4) sobre Pulumi en AWS, Next.js 16 (App Router), Lambdas TypeScript nativas, NestJS 11 en Fargate, Postgres (Neon + Drizzle) como única BD.

## Estructura del monorepo

```
apps/
  web/              → Frontend Next.js 16 (App Router)
  functions/        → AWS Lambda handlers (TypeScript nativo, sin framework)
  services/         → Servicios Fargate (NestJS)
packages/
  types/            → @todo-list-poc-infra/types — tipos compartidos (schemas Zod = source of truth)
  core/             → @todo-list-poc-infra/core — lógica de negocio (sin deps AWS)
  db/               → @todo-list-poc-infra/db — capa de BD Postgres (Neon + Drizzle), patrón Repository
  auth/             → @todo-list-poc-infra/auth — Auth0 (verificación JWT/JWKS, lazy upsert, claims RBAC)
  observability/    → @todo-list-poc-infra/observability — logging (Powertools/Pino) + correlationId
  config/           → @todo-list-poc-infra/config — tsconfig y eslint centralizados
infra/              → Infraestructura SST v4/Ion (apis, databases, events, networking, services, storage, webs, shared, helpers)
docs/               → Documentación de arquitectura (8 secciones numeradas + ARCHITECTURE.md índice + SETUP-*)
```

## Comandos de setup

```bash
pnpm install                    # Instalar dependencias de todo el monorepo
pnpm run build                  # Build de todas las apps (Next.js + NestJS)
pnpm run type-check             # Verificación de tipos en todo el monorepo
pnpm run lint                   # Lint de todo el monorepo
pnpm run clean                  # Limpiar builds y node_modules
```

## Desarrollo local

```bash
# Terminal 1: Lambdas con live reload
sst dev --stage <tu-nombre>

# Terminal 2: Servicio NestJS
pnpm --filter @todo-list-poc-infra/todo-service dev   # Sin Docker (tsx watch)
docker compose up                        # Con Docker

# Terminal 3: Frontend Next.js
pnpm --filter @todo-list-poc-infra/web dev
```

## Filtrar comandos por paquete

```bash
pnpm --filter @todo-list-poc-infra/web <comando>
pnpm --filter @todo-list-poc-infra/core <comando>
pnpm --filter @todo-list-poc-infra/functions <comando>
```

## Convenciones de código

- TypeScript strict mode en todo el monorepo.
- Configuraciones de tsconfig y eslint centralizadas en `packages/config/` (ESLint 9 flat config).
- Cada paquete extiende las configuraciones base de `@todo-list-poc-infra/config`.
- Turbo tasks: `build`, `dev`, `lint`, `test`, `type-check`, `clean`.
- `type-check` es topológico (`dependsOn: ["^type-check"]`); `lint` es local (sin deps).

## Patrones de arquitectura

- Lambdas: handlers nativos en `apps/functions/src/handlers/<dominio>/<accion>.ts` (el archivo es `<accion>.ts`; el export se llama `handler`, así que la ruta SST es `.../<accion>.handler`). Sin framework, tipado directo de eventos AWS.
- Servicios Fargate: NestJS en `apps/services/<nombre>/`. Cada servicio tiene su propio `Dockerfile`.
- Lógica de negocio: siempre en `packages/core/`, sin dependencias de AWS. Los handlers y servicios consumen core.
- Tipos compartidos: definir en `packages/types/` para que sean consumidos por todas las apps y paquetes.
- Capa de BD: `packages/db/` (Postgres con Neon + Drizzle), patrón Repository (importar la clase, nunca la tabla cruda). Es la única BD de la base; recetas para añadir MongoDB o RBAC por BD en `packages/db/AGENTS.md`.

## Infraestructura (SST v4 / Ion)

- Config raíz: `sst.config.ts` → delega a `infra/src/app.ts`.
- Recursos organizados en: `apis/`, `databases/`, `events/`, `networking/`, `services/`, `storage/`, `webs/`, `shared/`.
- Stages: cada dev usa su propio stage personal (`sst dev --stage <nombre>`). Compartidos: `dev`, `staging` (branch `test`) y `prod`. Solo `prod` tiene política `retain` (y `protect`).
- Región: `us-east-1`.
- Deploy: `sst deploy --stage dev|staging|prod`.
- Eliminar: `sst remove --stage <nombre>`.

## Comandos SST (v4 / Ion)

### Desarrollo local (live reload)

```bash
sst dev --stage <tu-nombre>           # Arranca entorno de desarrollo con live reload
sst dev --stage <tu-nombre> --verbose # Modo verbose para depuración
```

> Cada desarrollador usa su propio stage personal. Nunca usar `prod` para desarrollo.

### Deploy

```bash
sst deploy --stage dev                # Deploy al stage de desarrollo compartido (branch dev)
sst deploy --stage staging            # Deploy al stage de staging compartido (branch test)
sst deploy --stage prod               # Deploy a producción (recursos con política retain, branch main)
sst deploy --stage <tu-nombre>        # Deploy a un stage personal
```

### Eliminar stacks

```bash
sst remove --stage <tu-nombre>        # Elimina todos los recursos del stage
```

> Precaución: `sst remove` destruye todos los recursos del stage. En `prod` los recursos con `retain` se conservan.

### Inspección y diagnóstico

```bash
sst version                           # Verificar versión de SST instalada
sst secret set <KEY> <value> --stage <stage>   # Configurar un secret (subcomando: `secret`, singular)
sst secret remove <KEY> --stage <stage>        # Eliminar un secret
sst secret list --stage <stage>                # Listar secrets del stage
```

### Refresh de estado

```bash
sst refresh --stage <stage>           # Sincroniza el estado de SST con los recursos reales en AWS
```

> Útil cuando se modifican recursos manualmente en la consola de AWS o hay drift.

## Agregar nuevos componentes

### Nuevo handler Lambda

1. Crear carpeta en `apps/functions/src/handlers/<dominio>/`.
2. Crear `<accion>.ts` que exporte una función `handler` (patrón nativo, ver `health/ping.ts`).
3. Definir la ruta en `infra/src/apis/main-api.ts` apuntando a `.../<accion>.handler`.

### Nuevo servicio Fargate

1. Crear carpeta en `apps/services/<nombre-servicio>/`.
2. Inicializar NestJS con `package.json`, `tsconfig.json`, `Dockerfile`.
3. Agregar al `docker-compose.yml`.
4. Definir en `infra/src/services/workers.ts`.

## Prerequisitos

- Node.js **22** (ver `.nvmrc`; `nvm use`)
- pnpm `9.15.4` (pineado en `packageManager`)
- Docker y Docker Compose
- AWS CLI v2 configurado (perfil SSO)
- SST CLI (se usa desde el proyecto: `pnpm sst …`)

## Testing

Vitest está cableado: preset `@todo-list-poc-infra/config/vitest/base`, task `test` en Turbo y `pnpm test` en la raíz, con tests de ejemplo. Ver `packages/config/AGENTS.md`. El testing más amplio (integración, e2e, coverage gates) está en `ROADMAP.md`.

## Documentación adicional

La documentación de arquitectura está en `docs/` (8 archivos numerados 01-08 + `docs/ARCHITECTURE.md` como índice + `SETUP-*`, siendo `SETUP-ONBOARDING.md` la guía de inicio del dev). Lo pendiente/futuro está en `ROADMAP.md` (raíz).
