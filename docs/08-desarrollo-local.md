# 08 — Desarrollo Local y Servicios

Guía **única** de desarrollo local: prerrequisitos, quickstart, comandos del monorepo
(turbo + `--filter`) y cómo correr los servicios NestJS (standalone, SST y Docker).

> El patrón/arquitectura de cada área vive en su `AGENTS.md` local (raíz, `apps/services/AGENTS.md`,
> `infra/AGENTS.md`, etc.). Aquí van los **comandos** y el flujo del día a día.

---

## (a) Prerrequisitos

| Herramienta | Versión | Notas |
|---|---|---|
| **Node** | **22** | fijado en `.nvmrc` → usa `nvm use` |
| **pnpm** | **9.15.4** | fijado en `packageManager`; usa `pnpm`, nunca npm/yarn |
| **Docker** | v2 (`docker compose`, sin guion) | solo para el modo Docker de los servicios |
| **AWS CLI v2** | — | con un perfil SSO `base-apps-dev` (`AWS_PROFILE=base-apps-dev`) |
| **Neon** | cuenta + org | necesitas `NEON_ORG_ID` y una `NEON_API_KEY` personal |
| **Auth0** | opcional | solo si pruebas rutas autenticadas (`AUTH0_*` en `.env`) |

```bash
node --version    # v22.x   (nvm use lo deja en la versión correcta)
pnpm --version    # 9.15.4
docker --version  # solo si vas a usar el modo Docker
aws --version     # AWS CLI v2
```

El perfil AWS se configura una vez (ver `docs/SETUP-AWS.md`):

```bash
aws configure sso --profile base-apps-dev   # región us-east-1
aws sso login --profile base-apps-dev
```

---

## (b) Quickstart

```bash
nvm use                       # Node 22 (lee .nvmrc)
pnpm install                  # instala todo el workspace
cp .env.example .env          # un ÚNICO .env en la raíz del monorepo
# → edita .env y rellena los valores (ver abajo)
sst dev --stage <tu-usuario>  # live reload de Lambdas + recursos del stage
```

### Rellena el `.env` ANTES del primer `sst dev`

El `.env` de la raíz es **único** (lo comparten SST, drizzle, `apps/web` y los servicios; **no hay
`.env` por servicio**). Si lo dejas incompleto, el primer `sst dev`/`sst deploy` **falla**: `neon.ts`
lanza error si falta `NEON_ORG_ID`, y los stages personales fallan si faltan `NEON_DEV_PROJECT_ID`
(neon.ts) o `SHARED_DEV_VPC_ID` (vpc.ts).

Orden de llenado:

1. **Antes de cualquier deploy** — valores que ya tienes:
   - `NEON_ORG_ID` — Organization ID de Neon (compartido por el equipo, no es secret).
   - `NEON_API_KEY` — API key **personal** de Neon (cada dev la suya, no committear).
   - `AWS_PROFILE=base-apps-dev`, `AWS_REGION=us-east-1`.
2. **Tras el primer `sst deploy --stage dev`** — captura estos dos **outputs** del stack y pégalos en `.env`
   (también committeados en `.env.example` para el resto del equipo):
   - `neonProjectId` → `NEON_DEV_PROJECT_ID`
   - `vpcId` → `SHARED_DEV_VPC_ID`
3. **Para el standalone de servicios y migraciones** (opcional):
   - `DATABASE_URL` — connection string de tu branch Neon (Neon console → Connection Details, o el output de `sst deploy`).
4. **Solo si pruebas rutas autenticadas** (opcional): `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`, etc.

> Stages: cada dev usa **su propio stage** personal; los compartidos son `dev`, `staging` (rama `test`)
> y `prod`; `prod` es el único con `removal: "retain"`. Nunca uses `prod` ni el stage de otro compañero
> para desarrollar.
> El stage `dev` debe estar desplegado primero (`sst deploy --stage dev`) para que existan la VPC/NAT
> y el proyecto Neon compartidos que referencian los stages personales.

### Qué hace `sst dev --stage <usuario>`

1. Crea/actualiza los recursos del stage (API Gateway, servicio ECS, branch Neon, etc.).
2. Corre los handlers Lambda **en tu máquina** (Live Lambda Dev), conectados a recursos reales de AWS.
3. Recarga al instante cuando cambias código. La primera ejecución tarda más (crea todo el stage).

---

## (c) Comandos del monorepo

Turborepo orquesta las tareas; los scripts se definen en el `package.json` de **cada** paquete y la raíz
delega con `turbo run`. Respeta el orden de dependencias (`@app/types` antes que `@app/core`), paraleliza
lo independiente y cachea resultados.

### Desde la raíz (todo el monorepo)

```bash
pnpm run build        # turbo run build      (web + example-service)
pnpm run type-check   # turbo run type-check (topológico: ^type-check)
pnpm run lint         # turbo run lint
pnpm run dev          # turbo run dev        (todas las apps con dev server)
pnpm run test         # turbo run test       (Vitest, ver nota abajo)
pnpm run clean
pnpm run format       # prettier --write
```

> **Testing:** `pnpm test` es el punto de entrada cableado (Vitest, presets en `@app/config` →
> `vitest/base`), y la tarea `test` ya está en Turbo. **`@app/core`, `@app/db` y `@app/observability`**
> declaran `"test": "vitest run"` y traen tests de ejemplo (`buildEvent.test.ts`, `user.validator.test.ts`,
> `redactor.test.ts`, `users.repository.test.ts`). Ampliarlo (tests de integración con branches Neon
> efímeras, Playwright/e2e, gates de coverage) es **per-project** y está en el ROADMAP.

### Por paquete (`--filter @app/*`, desde la raíz)

```bash
# Frontend Next.js — http://localhost:3000
pnpm --filter @app/web dev
pnpm --filter @app/web build
pnpm --filter @app/web lint

# Servicio NestJS (standalone) — http://localhost:3001
pnpm --filter @app/example-service dev
pnpm --filter @app/example-service build      # esbuild → dist/main.js

# Lambdas (solo checks; se ejecutan vía sst dev)
pnpm --filter @app/functions type-check
pnpm --filter @app/functions lint

# Paquetes compartidos
pnpm --filter @app/core type-check
pnpm --filter @app/db   type-check
pnpm --filter @app/infra type-check
```

Puedes entrar al directorio y correr `pnpm dev` directamente, pero pierdes que Turbo construya las
dependencias primero; lo recomendado es siempre `--filter` desde la raíz.

### Migraciones de BD (Drizzle, en `@todo-list-poc-infra/db`)

**Se aplican solas en cada `sst dev` / `sst deploy`** (recurso `DbMigrate` en
`infra/src/databases/migrate.ts`), así que `db:migrate` a mano casi nunca hace falta. Lo único manual es
**generar** el SQL cuando cambias el schema.

```bash
pnpm --filter @todo-list-poc-infra/db db:generate   # genera SQL desde el schema (manual)
pnpm --filter @todo-list-poc-infra/db db:migrate    # aplica a mano (escape hatch; requiere DATABASE_URL en .env)
pnpm --filter @todo-list-poc-infra/db db:studio     # drizzle-kit studio (UI web)
```

`adapters/postgresql/schema.ts` es la fuente de verdad; tras editarlo corre `db:generate` y commitea el
SQL resultante — el siguiente `sst dev`/`sst deploy` lo aplica automáticamente.

### SST v4 (Ion/Pulumi)

```bash
sst dev --stage <usuario>            # live reload (también arranca el servicio NestJS en modo live)
sst deploy --stage dev|staging|prod  # deploy a un stage (imprime los outputs del stack)
sst remove --stage <usuario>         # destruye TODOS los recursos del stage
sst secret set <KEY> <valor> --stage <stage>   # SINGULAR: secret, no secrets
sst secret remove <KEY> --stage <stage>
sst diff --stage <stage>             # diff del stack contra AWS
sst state                            # inspección del estado de SST
```

> Comandos `secret` en **singular** (`sst secret set/remove`). **No** existen `sst status` ni
> `sst console` en esta versión. `sst remove` en `prod` conserva los recursos con `retain`.

---

## (d) Servicios NestJS en local

Un **único `.env` en la raíz** alimenta los 3 modos (no hay `.env` por servicio). Bajo `sst dev`, las env
vars que inyecta SST tienen **prioridad** sobre el `.env`.

| Modo | Comando | Env | Cuándo |
|---|---|---|---|
| **Standalone** (recomendado) | `pnpm --filter @app/example-service dev` | `.env` (lo carga el script) | loop diario, el más rápido |
| **SST** | `sst dev --stage <usuario>` | inyectado por SST (solo `DATABASE_URL` linkeado; Auth0 desde el `.env`) | cableado completo (API Gateway, Cloud Map) |
| **Docker** | `docker compose up example-service` | mismo `.env` vía `env_file` | paridad con el contenedor / debug del deploy |

Todas las rutas cuelgan de `/api` (`setGlobalPrefix("api")`), por eso el health es `/api/health` (no `/health`).

### Modo 1 — Standalone (sin contenedor)

El script `dev` es **`tsx watch`** (hot-reload), nunca `nest start`. El build es **esbuild**, no `nest build`.

```bash
pnpm --filter @app/example-service dev     # tsx watch + carga ./.env de la raíz
curl http://localhost:3001/api/health      # → {"status":"ok","service":"example-service"}
```

Se conecta a Postgres (Neon) vía `DATABASE_URL`; `getPostgresClient` usa el pool TCP `pg` (no está en
Lambda). No necesita web, functions ni SST. Para correr dos servicios a la vez, override del puerto inline:
`PORT=3002 pnpm --filter <svc> dev`.

### Modo 2 — SST (`sst dev`)

```bash
sst dev --stage <usuario>
```

SST corre el mismo `pnpm dev` en modo live e inyecta los recursos linkeados (por defecto solo
`DATABASE_URL`, de Neon). La config Auth0 sale del `.env` raíz (no de SSM: `SECRETS_MANIFEST` está vacío).
Úsalo cuando necesites el routing real del API Gateway (`/api/*` → VPC Link + Cloud Map).

### Modo 3 — Docker

El `docker-compose.yml` (raíz) usa el stage **`builder`** del Dockerfile (no la imagen de producción),
monta `src/` + `packages/`, corre `command: pnpm dev` (el mismo **`tsx watch`** que standalone) y carga el
**mismo `.env` de la raíz** vía `env_file: .env`. Define un `healthcheck` que pega a `/api/health`.

```bash
docker compose up example-service       # levanta el servicio con hot-reload
docker compose up -d example-service    # en background
docker compose down                     # detener
docker compose logs -f example-service  # ver logs (si está en background)
docker compose build example-service    # rebuild tras cambiar dependencias / Dockerfile
```

**Hot-reload:** los volúmenes montan tu código local; cambios en `src/` o `packages/` se reflejan sin
rebuild. Solo necesitas `docker compose build` tras tocar dependencias en un `package.json`, el
`Dockerfile` o al añadir un paquete nuevo.

El Dockerfile es **multi-stage** (Node 22 alpine): el stage `builder` instala deps y corre `pnpm run build`
(esbuild bundlea los `@app/*` inline en `dist/main.js`); el stage `production` hace `pnpm install --prod`,
corre como usuario no-root `node`, usa `tini` como init (PID 1), fija `NODE_ENV=production` y trae un
`HEALTHCHECK` a `/api/health`. Para verificar la imagen real de ECS (sin hot-reload):

```bash
docker build -f apps/services/example-service/Dockerfile -t example-service .   # context = raíz
docker run --env-file .env -p 3001:3001 example-service
curl http://localhost:3001/api/health
```

**Credenciales AWS:** hoy el servicio solo habla con Neon (Postgres) y Auth0 (JWKS público), ambos HTTP
externos → **no** necesita credenciales AWS. Si en el futuro usa SDKs de AWS, pásaselas por env o montando
`~/.aws` (vía `aws sso login --profile base-apps-dev` + `aws configure export-credentials`).

---

## Puertos

| Servicio | Puerto | Comando |
|---|---|---|
| Next.js (web) | 3000 | `pnpm --filter @app/web dev` |
| Example Service (standalone) | 3001 | `pnpm --filter @app/example-service dev` |
| Example Service (Docker) | 3001 | `docker compose up example-service` |
| API Gateway (Lambdas) | dinámico | `sst dev --stage <usuario>` (URL en el output) |

---

## Un día de trabajo

```bash
# 1. Lambdas + stage personal con live reload (también arranca el servicio NestJS en modo live)
sst dev --stage <usuario>

# 2. (alternativa al servicio bajo SST) standalone, el más rápido para iterar
pnpm --filter @app/example-service dev

# 3. Frontend
pnpm --filter @app/web dev

# 4. Desarrolla; los cambios se reflejan automáticamente

# 5. Al terminar (opcional, limpiar el stage personal)
sst remove --stage <usuario>
```

> **Seguridad:** nunca commitees `.env` con valores reales (está en `.gitignore`); `.env.example` es la
> plantilla. Prefiere credenciales temporales (SSO/STS).

## Ver también

- `AGENTS.md` (raíz) — layout del monorepo y cómo añadir servicios/Lambdas.
- `apps/services/AGENTS.md` — patrón/arquitectura de los servicios NestJS.
- `infra/src/services/workers.ts` — cómo se despliega el servicio en ECS.
- `docs/SETUP-AWS.md` · `docs/SETUP-NEON.md` · `docs/SETUP-AUTH0.md` — setup de cada proveedor.
