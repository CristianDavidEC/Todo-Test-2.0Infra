# Infraestructura SST v4

## Visión General

SST v4 (Ion) es el framework de infraestructura como código del proyecto. Usa Pulumi internamente (no CloudFormation). El `sst.config.ts` vive en la raíz del monorepo como único archivo de SST fuera de `infra/` y delega toda la definición a `infra/src/app.ts`.

## Estructura

```
sst.config.ts                    # Entry point de SST (raíz del monorepo)
infra/
├── src/
│   ├── app.ts                   # Orquestador: importa los módulos en orden y exporta outputs
│   ├── helpers/
│   │   ├── stage.ts             # isPersonalStage/isSharedStage/isProduction/isStaging,
│   │   │                        #   getLogRetention, getRemovalPolicy, getEcsTaskSize, getEcsTaskCount
│   │   └── env.ts               # requireSharedEnv (fail-fast en stages compartidos)
│   ├── networking/
│   │   └── vpc.ts               # VPC + NAT instance t4g.nano
│   ├── shared/
│   │   ├── secrets.ts           # manifest sst.Secret/SSM (VACÍO por defecto; la base usa env vars)
│   │   └── tags.ts              # Tags globales (defaultTags del provider AWS)
│   ├── databases/
│   │   └── neon.ts              # Neon (Postgres) — BD primaria/única
│   ├── services/
│   │   └── workers.ts           # Fargate (ECS NestJS) + Cloud Map
│   ├── apis/
│   │   └── main-api.ts          # API Gateway v2 + rutas (Lambda /ping + NestJS privado /api/*)
│   ├── webs/
│   │   └── web.ts               # Next.js (OpenNext)
│   ├── storage/                 # TODO — no cableado en app.ts
│   └── events/                  # TODO — no cableado en app.ts
├── package.json
└── tsconfig.json
```

## Flujo de ejecución

`sst.config.ts → run() → import("./infra/src/app")`. `app.ts` importa los módulos en orden estricto (recursos base primero, dependientes después):

```
1. networking/vpc      (VPC + NAT)
2. shared/secrets      (sst.Secret)
3. databases/neon      (Postgres)
4. services/workers    (ECS NestJS via Cloud Map)
5. apis/main-api       (API Gateway: GET /ping Lambda + ANY /api/* NestJS privado)
6. webs/web            (Next.js)
```

`storage/` y `events/` existen como carpetas pero su import está pendiente (TODO); aún no forman parte del orden activo.

`run()` devuelve los **outputs** del stack, que `sst deploy` imprime:

```typescript
export const outputs = {
  vpcId: vpc.id,
  neonProjectId: neonDb.id,
  apiUrl,
  webUrl: web.url,
};
```

`vpcId` y `neonProjectId` se capturan tras `sst deploy --stage dev` para poblar `SHARED_DEV_VPC_ID` y `NEON_DEV_PROJECT_ID` en `.env` (bootstrap de stages personales).

## `sst.config.ts`

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

const APP_NAME = "base-apps";

export default $config({
  async app(input) {
    const { getAllTags } = await import("./infra/src/shared/tags");
    const { getRemovalPolicy } = await import("./infra/src/helpers/stage");
    return {
      name: APP_NAME,
      removal: getRemovalPolicy(input.stage),   // "retain" solo en prod
      protect: input.stage === "prod",          // bloquea sst remove --stage prod
      home: "aws",
      providers: {
        aws: { region: "us-east-1", defaultTags: { tags: getAllTags(APP_NAME, input.stage) } },
        neon: "0.13.0",
      },
    };
  },
  async run() {
    const { outputs } = await import("./infra/src/app");
    return outputs;
  },
});
```

- `getRemovalPolicy(stage)` → `"retain"` en prod (evita borrar recursos), `"remove"` en el resto.
- `protect: stage === "prod"` → bloquea un `sst remove --stage prod` accidental.
- `defaultTags` aplica tags globales a cada recurso AWS (fuente única: `infra/src/shared/tags.ts`).
- SST prohíbe imports top-level en `sst.config.ts`; por eso se usan imports dinámicos.

---

## Networking — VPC + NAT instance

`infra/src/networking/vpc.ts`. Decisión deliberada de costo: en vez del **NAT Gateway** gestionado (~$33-100/mes) se usa un **NAT instance EC2 `t4g.nano`** (~$3/mes). Egress idéntico a una fracción del costo. "Sin NAT" en el diseño significaba "sin NAT Gateway", no "sin salida a internet".

- **prod / staging** → VPC propia (2 AZs) + NAT instance.
- **dev** → VPC propia (1 AZ) + NAT instance.
- **personal** → **referencia** la VPC + NAT de `dev` vía `SHARED_DEV_VPC_ID` (lanza si falta).

Las **Lambdas siempre van fuera de VPC** (no se les pasa el campo `vpc`).

---

## Credenciales — env vars (una sola fuente de verdad)

TODA credencial (config y secretos) se maneja como **env var** (`process.env`): en local del `.env`, en deploy de las Variables/Secrets del GitHub Environment. Sin SSM por defecto. El infra las lee con `requireSharedEnv("X")` (`helpers/env.ts`), que hace fail-fast en stages compartidos si falta. Los secretos de Auth0 (`AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`) se inyectan así a la web en `webs/web.ts`. Detalle completo del reparto repo/Environment en [`SETUP-CICD.md`](SETUP-CICD.md) §2.1/§4.

**Escape-hatch SSM (opcional, vacío por defecto):** `infra/src/shared/secrets.ts` mantiene `SECRETS_MANIFEST` para declarar un `sst.Secret` (SSM Parameter Store SecureString) si un proyecto necesita un secreto fuera de CI; se setea con `sst secret set <Name> <value> --stage <stage>`. La base no lo usa. El connection string a Neon tampoco va aquí (viene del Linkable `database` en `neon.ts`).

---

## Bases de datos — Neon (Postgres)

`infra/src/databases/neon.ts`. Estrategia híbrida por stage:

- **prod / staging** → proyecto Neon propio (`base-apps-<stage>`), aislado.
- **dev** → proyecto Neon compartido (`base-apps-dev`), main branch.
- **personal** → **branch** copy-on-write en el proyecto `dev` (requiere `NEON_DEV_PROJECT_ID`). Se crea su `neon.Branch` + `neon.Endpoint` propios; `sst remove` **SÍ destruye** esa branch (es un recurso del stack personal, no la BD compartida).

El módulo exporta el Linkable `database` (consumido con `link: [database]`), `databaseUrl` (Output crudo que se inyecta como `DATABASE_URL`) y `neonDb` (`{ kind, id }`, usado como output del stack). Cualquier stage no contemplado lanza `throw` (`Stage no soportado en neon.ts`).

---

## Compute — ECS (Fargate) + API Gateway

### Servicio ECS

`infra/src/services/workers.ts`. Un `sst.aws.Cluster` + `cluster.addService("ExampleService", ...)`:

- Imagen desde `apps/services/example-service/Dockerfile` (context `.`).
- **`serviceRegistry: { port: 3001 }`** → registro Cloud Map, requerido para el VPC link del API Gateway. **Sin ALB.**
- `cpu`/`memory`/`scaling` stage-aware vía `getEcsTaskSize`/`getEcsTaskCount`.
- `logging.retention` stage-aware (`getLogRetention`).
- **Health check de ECS** (`wget --spider http://localhost:3001/api/health`): como no hay ALB, ECS reemplaza la task si NestJS se cuelga sin crashear.
- `environment`: `DATABASE_URL`, `APP_STAGE`, y config Auth0 (`AUTH0_DOMAIN`/`AUTH0_AUDIENCE` con `requireSharedEnv` → fail-fast en stages compartidos, vacío en personales).
- En `sst dev` corre local (`pnpm dev`) en vez de buildear la imagen.

### API Gateway

`infra/src/apis/main-api.ts`. Un `sst.aws.ApiGatewayV2("MainApi")` (única superficie pública), con `vpc` para poder crear el VPC link:

- `GET /ping` → Lambda (`apps/functions/src/handlers/health/ping.handler`); no requiere VPC ni BD.
- `ANY /api/{proxy+}` → NestJS en ECS vía `api.routePrivate(...)` apuntando al ARN del Cloud Map service (**sin ALB**). Solo se cablea cuando `!$dev` (en `sst dev` el servicio corre local y no hay Cloud Map).
- Retención de logs stage-aware aplicada a toda ruta Lambda vía `transform.route.handler`.

---

## Frontend — Next.js (OpenNext)

`infra/src/webs/web.ts`. Un `sst.aws.Nextjs("Web")` con `path: "apps/web"`:

- **`openNextVersion: "4.0.3"` forzado:** Next 16 usa `proxy.ts`, que el default de OpenNext de SST no entiende; sin esto el build OpenNext falla.
- `environment`: config pública Auth0 (`AUTH0_DOMAIN`/`AUTH0_CLIENT_ID`/`AUTH0_AUDIENCE` con `requireSharedEnv`), `NEXT_PUBLIC_API_URL` (= `apiUrl`), `APP_BASE_URL` (localhost en `sst dev`, URL del stage en deploy) y los secretos del SDK (`AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`), todos leídos de `process.env` con `requireSharedEnv` (en deploy del GitHub Environment Secret, en local del `.env`). Sin `sst.Secret`/SSM.

---

## Clasificación de stages

`infra/src/helpers/stage.ts`:

```typescript
const SHARED_ENVIRONMENTS = ["dev", "staging", "prod"] as const;

export function isPersonalStage(stage: string): boolean {
  return !SHARED_ENVIRONMENTS.includes(stage as SharedStage);
}
export function isSharedStage(stage: string): boolean {
  return SHARED_ENVIRONMENTS.includes(stage as SharedStage);
}
```

Sobre esta clasificación, los helpers ajustan comportamiento por stage: `getLogRetention` (1 semana dev/personal · 2 semanas staging · 1 mes prod), `getRemovalPolicy`, `getEcsTaskSize` (0.25 vCPU/0.5 GB no-prod · 0.5 vCPU/1 GB staging/prod) y `getEcsTaskCount` (min/max 1 salvo prod 2-4).

`infra/src/helpers/env.ts` — `requireSharedEnv(name)`: devuelve la env var, o **lanza** si falta en un stage compartido (no produce un servicio "verde pero roto"); en stages personales devuelve `""` (config opcional como Auth0 puede faltar en local).

### Patrón compartido vs aislado

- **Estado persistente** (BD, VPC/NAT): en stages personales se **referencia** el de `dev` (`SHARED_DEV_VPC_ID`, branch Neon del proyecto dev). En entornos reales, propio.
- **Cómputo / eventos** (Lambda, API Gateway, ECS): siempre aislado por stage.

> Nota: la branch Neon de un stage personal **sí** la destruye `sst remove` (es parte del stack personal). Lo que no se toca es la VPC/NAT de dev (solo se referencia) ni la BD compartida del proyecto dev.

---

## Estrategia de entornos

| Entorno | Stage | Comando |
|---------|-------|---------|
| Desarrollo personal | `<usuario>` | `sst dev --stage <usuario>` (ECS+web locales, VPC/NAT de dev, branch Neon propia) |
| Desarrollo (deploy) | `dev` | `sst deploy --stage dev` |
| Staging | `staging` | `sst deploy --stage staging` |
| Producción | `prod` | `sst deploy --stage prod` (único con `removal: retain` + `protect`) |

### Cómo agregar un nuevo entorno compartido (ej: `qa`)

No basta con tocar `SHARED_ENVIRONMENTS`. Hay que actualizar **varias** ramas que hoy solo contemplan dev/staging/prod:

1. **`helpers/stage.ts`** → agregar `"qa"` a `SHARED_ENVIRONMENTS`, y añadir la rama `qa` en `getEcsTaskSize`, `getEcsTaskCount` y `getLogRetention` si quieres un comportamiento distinto al default.
2. **`databases/neon.ts`** → añadir la rama de `qa` (hoy hace `throw` para stages no contemplados que no sean dev/personales): decide si crea proyecto propio o branch.
3. Configurar credenciales AWS / env vars (`requireSharedEnv` fallará si falta config crítica).
4. `sst deploy --stage qa`.

---

## Comandos principales

```bash
# Desarrollo local — ECS y web corren en tu máquina; referencias a recursos compartidos de dev
sst dev --stage <tu-nombre>

# Desplegar a un entorno
sst deploy --stage dev
sst deploy --stage prod

# Eliminar los recursos de un stage personal (incluida su branch Neon)
sst remove --stage <tu-nombre>

# Secrets (comando SINGULAR)
sst secret set <KEY> <value> --stage <stage>
```

> SST v4 **no** tiene `sst status`. El comando de secrets es `sst secret` (singular).

---

## Cómo agregar un nuevo tipo de recurso

1. Crear el archivo en la carpeta correspondiente de `infra/src/` (`apis/`, `databases/`, `events/`, `networking/`, `services/`, `storage/`, `webs/`, `shared/`)
2. Usar el patrón compartido/aislado según el tipo de recurso (`isPersonalStage`)
3. Exportar el recurso para que otros módulos lo referencien
4. Importar en `infra/src/app.ts` en el orden correcto
5. Si una Lambda/servicio necesita acceso, usar `link: [recurso]` (o inyectar la env var)

## Uso de Pulumi directamente

Si SST no tiene un componente nativo, puedes usar Pulumi directamente (`import * as aws from "@pulumi/aws"`). SST y Pulumi coexisten en el mismo archivo sin problema.
