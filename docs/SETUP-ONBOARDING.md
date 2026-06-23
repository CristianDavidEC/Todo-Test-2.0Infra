# Onboarding — de cero a corriendo

Guía de **inicio** para un desarrollador nuevo: qué configurar, en qué orden, y cómo
arrancar y ejecutar el proyecto. Es el punto de entrada; remite a las guías detalladas
([SETUP-AWS](./SETUP-AWS.md), [SETUP-NEON](./SETUP-NEON.md), [SETUP-AUTH0](./SETUP-AUTH0.md))
y a [08-desarrollo-local](./08-desarrollo-local.md) para el día a día.

## Antes de empezar: ¿cuál es tu caso?

Hay **dos escenarios**. Identifica el tuyo:

| | Escenario A — **Bootstrap inicial** | Escenario B — **Dev nuevo** |
|---|---|---|
| Cuándo | El stage `dev` compartido **aún no existe** (proyecto recién creado) | El stage `dev` **ya está desplegado** (lo normal al unirte) |
| Quién | Una persona, **una vez** por proyecto | Cada desarrollador |
| Qué hace | Crea la VPC + el proyecto Neon **compartidos** | Solo configura su **stage personal** |
| Salto | Haz los pasos 0–5 y luego el **Escenario A** (paso 6A) | Haz los pasos 0–5 y luego el **Escenario B** (paso 6B) |

> ¿No sabes cuál? Pregunta al equipo si ya existe el stage `dev` y si hay un
> `NEON_DEV_PROJECT_ID` / `SHARED_DEV_VPC_ID` que copiar. Si te los dan → Escenario B.

---

## Paso 0 — Prerrequisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| **Node** | **22** (`.nvmrc`) | runtime; `nvm use` lo fija |
| **pnpm** | **9.15.4** | gestor del monorepo (nunca npm/yarn) |
| **AWS CLI v2** | — | deploy + perfil SSO |
| **Cuenta Neon** | org + API key | Postgres serverless |
| **Docker** | v2 (`docker compose`) | opcional, solo modo Docker de servicios |
| **Tenant Auth0** | — | opcional, solo para probar login/rutas protegidas |

```bash
node --version    # v22.x
pnpm --version    # 9.15.4
aws --version     # aws-cli/2.x
```

Si no tienes Node 22: instala `nvm` y luego `nvm install 22`.

---

## Paso 1 — Clonar e instalar

```bash
git clone <repo-url>
cd Base-Projects-SST
nvm use            # Node 22 (lee .nvmrc)
pnpm install       # instala todo el workspace
```

Verifica que el monorepo está sano (no necesita AWS/Neon aún):

```bash
pnpm run type-check   # 9/9 en verde
pnpm run test         # tests de ejemplo (core/db/observability)
```

---

## Paso 2 — Cuenta AWS (perfil SSO)

Configura el perfil **una vez** (detalle en [SETUP-AWS](./SETUP-AWS.md)):

```bash
aws configure sso --profile base-apps-dev   # región us-east-1
aws sso login --profile base-apps-dev       # repetir cuando expire la sesión
```

---

## Paso 3 — Cuenta Neon

En [console.neon.tech](https://console.neon.tech) (detalle en [SETUP-NEON](./SETUP-NEON.md)):

1. Crea/usa la **organización** del equipo → anota el **Organization ID** (`NEON_ORG_ID`).
2. Genera una **API key personal** (org-scoped) → `NEON_API_KEY` (es tuya, **no la committees**).

---

## Paso 4 — (Opcional) Auth0

Solo si vas a probar login o rutas protegidas. Sigue [SETUP-AUTH0](./SETUP-AUTH0.md) para
obtener `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE` y, para el login web,
`AUTH0_CLIENT_SECRET` + `AUTH0_SECRET` (`openssl rand -hex 32`).

> Sin Auth0 configurado el sitio sigue funcionando público (guard `isAuth0Configured`);
> solo las rutas autenticadas quedan inactivas.

---

## Paso 5 — Crear el `.env`

Hay **un único `.env` en la raíz** (lo comparten SST, drizzle, `apps/web` y los servicios;
**no hay `.env` por servicio**).

```bash
cp .env.example .env
```

Rellena lo que ya tienes (los demás se completan en el paso 6):

```ini
AWS_PROFILE=base-apps-dev
AWS_REGION=us-east-1
NEON_ORG_ID=org-xxxx          # del paso 3
NEON_API_KEY=napi_xxxx        # del paso 3 (personal)
# AUTH0_* → solo si hiciste el paso 4
```

> **Importante:** el `.env` debe estar completo **antes** del primer `sst dev`/`sst deploy`.
> Si falta algo crítico, la infra **falla a propósito** con un mensaje que dice qué poner
> (ver [Troubleshooting](#troubleshooting)).

---

## Paso 6A — Bootstrap inicial (Escenario A, una vez por proyecto)

Despliega el stage `dev` compartido. Crea la VPC + NAT y el proyecto Neon que los stages
personales reutilizarán:

```bash
pnpm sst deploy --stage dev
```

Al terminar, `sst deploy` imprime **outputs**. Copia dos de ellos al `.env` (y commitéalos a
`.env.example` para el resto del equipo):

```ini
NEON_DEV_PROJECT_ID=<neonProjectId del output>
SHARED_DEV_VPC_ID=<vpcId del output>
```

Listo: ahora cualquier dev (incluido tú) puede levantar su stage personal → continúa en **6B**.

---

## Paso 6B — Tu stage personal (Escenario B, cada dev)

Con el `dev` compartido ya existente, asegúrate de tener en `.env` los dos valores que el
equipo te pasó (o que quedaron committeados en `.env.example`):

```ini
NEON_DEV_PROJECT_ID=proj-xxxx     # proyecto Neon compartido de dev
SHARED_DEV_VPC_ID=vpc-xxxx        # VPC compartida de dev
```

Levanta tu stage personal (usa tu usuario; crea una **branch Neon** propia copy-on-write y
referencia la VPC de dev):

```bash
pnpm sst dev --stage <tu-usuario>
```

`sst dev` orquesta todo el stack en modo live: Lambdas con hot-reload, el servicio NestJS
(`tsx watch`) y el frontend Next.js. Déjalo corriendo.

---

## Paso 7 — Migraciones de base de datos

El schema vive en `packages/db` (Drizzle). **Las migraciones se aplican solas en cada `sst dev` /
`sst deploy`** (recurso `DbMigrate` en `infra/src/databases/migrate.ts`), así que normalmente **no
tienes que correr `db:migrate` a mano** — al levantar `sst dev` tu branch queda migrada.

Lo único manual es **generar** la migración cuando cambias el schema:

```bash
# editas packages/db/src/adapters/postgresql/schema.ts y luego:
pnpm --filter @todo-list-poc-infra/db db:generate   # genera el .sql → lo aplica el próximo deploy
```

Comandos de apoyo (opcionales). El manual de `db:migrate` necesita el connection string en `.env`
(de la consola de Neon → *Connection Details*, o del output del deploy):

```ini
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

```bash
pnpm --filter @todo-list-poc-infra/db db:migrate    # aplicar a mano (escape hatch / debugging)
pnpm --filter @todo-list-poc-infra/db db:studio     # explorar la BD
```

---

## Paso 8 — Verificar que corre

Con `sst dev` levantado:

| Qué | Cómo | Esperado |
|---|---|---|
| Frontend | abre `http://localhost:3000` | landing de la plantilla |
| Health Lambda | `GET <apiUrl>/ping` (apiUrl del output) | `200` |
| Health servicio | `GET http://localhost:3001/api/health` | `200` |
| API docs (Swagger) | `http://localhost:3001/api/docs` | UI (oculta en prod) |
| Ruta protegida | `GET /api/me` con Bearer JWT | `200` con Auth0; `401` sin token |

Chequeos del repo (sin necesidad de AWS):

```bash
pnpm run type-check && pnpm run lint && pnpm run test && pnpm run build
```

---

## Flujo del día a día

```bash
aws sso login --profile base-apps-dev   # si expiró la sesión SSO
nvm use
pnpm sst dev --stage <tu-usuario>       # todo el stack en live reload
```

Correr una pieza **standalone** (sin SST; requiere `DATABASE_URL` en `.env`):

```bash
pnpm --filter @app/web dev              # solo el frontend (localhost:3000)
pnpm --filter @app/example-service dev  # solo el servicio NestJS (localhost:3001, tsx watch)
```

Comandos completos y modo Docker: [08-desarrollo-local](./08-desarrollo-local.md).

Cuando termines un experimento, puedes destruir tu stage personal (borra tu branch Neon, **no**
toca el `dev` compartido):

```bash
pnpm sst remove --stage <tu-usuario>
```

---

## Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `NEON_ORG_ID env var requerido` | falta en `.env` | paso 3 + paso 5 |
| `NEON_DEV_PROJECT_ID env var requerido para stages personales` | el `dev` compartido no está desplegado, o no copiaste el output | Escenario A primero (6A); luego pon el valor en `.env` |
| `SHARED_DEV_VPC_ID env var requerido para stages personales` | ídem para la VPC | copia `vpcId` del output de `sst deploy --stage dev` |
| `Env var AUTH0_* requerida para el stage compartido` | deploy a dev/staging/prod sin Auth0 en `.env` | rellena `AUTH0_*` (en personales puede faltar) |
| `DATABASE_URL no está definida` (drizzle) | migraciones sin connection string | pon `DATABASE_URL` en `.env` (paso 7) |
| Sesión AWS expirada | SSO caducó | `aws sso login --profile base-apps-dev` |

---

## Checklist

- [ ] Node 22 (`nvm use`) + `pnpm install` + `pnpm type-check` verde
- [ ] Perfil AWS SSO configurado y logueado
- [ ] `NEON_ORG_ID` + `NEON_API_KEY` en `.env`
- [ ] (Escenario A) `sst deploy --stage dev` hecho → outputs copiados a `.env`/`.env.example`
- [ ] (Escenario B) `NEON_DEV_PROJECT_ID` + `SHARED_DEV_VPC_ID` en `.env`
- [ ] `sst dev --stage <tu-usuario>` levanta el stack
- [ ] Migraciones aplicadas automáticamente por el `sst dev` (recurso `DbMigrate`)
- [ ] `http://localhost:3000` y `/api/health` responden
