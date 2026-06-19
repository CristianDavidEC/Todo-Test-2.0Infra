# Setup CI/CD (GitHub Actions + OIDC)

Esta guía deja operativos los workflows de [`.github/workflows/`](../.github/workflows).
Es **configuración una sola vez** del repo y de la cuenta AWS; los workflows ya están
versionados en el código.

## Modelo de ambientes (branch-per-environment)

| Rama git | Stage SST | Workflow | Deploy |
|---|---|---|---|
| `dev` | `dev` | `deploy-dev.yml` | automático en push |
| `test` | `staging` | `deploy-staging.yml` | automático en push |
| `main` | `prod` | `deploy-prod.yml` | automático en push (con gate de aprobación) |
| `<usuario>` (personal) | `<usuario>` | — | `sst dev` local, sin CI |

Promoción vía PRs: `feat/* → dev → test → main`. Cada PR dispara
[`pr-checks.yml`](../.github/workflows/pr-checks.yml) (lint · type-check · test · build),
sin desplegar.

## 1. OIDC: confianza AWS ↔ GitHub (sin llaves estáticas)

Los deploys NO usan `AWS_ACCESS_KEY`. El runner pide credenciales temporales a AWS vía
OIDC y AWS las concede solo si la petición viene de este repo y la rama esperada.

### 1.1 Crear el OIDC provider (una vez por cuenta AWS)

Si la cuenta aún no tiene el provider de GitHub:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 1c58a3a8518e8759bf075b76b750d4f2df264fcd
```

### 1.2 Crear un IAM role por ambiente

Tres roles: `gha-deploy-dev`, `gha-deploy-staging`, `gha-deploy-prod`. Cada uno con una
**trust policy** que limita qué puede asumirlo. Reemplaza `<ACCOUNT_ID>` y `<ORG>/<REPO>`.

Trust policy de **dev**. ⚠️ El `sub` se ata al **GitHub Environment**, NO a la rama:
nuestros workflows de deploy usan `environment:` (para el gate de aprobación), y eso hace
que GitHub emita el claim `sub` como `...:environment:<name>` en vez de `...:ref:refs/heads/<branch>`.
Si filtras por rama, `sts:AssumeRoleWithWebIdentity` falla con "Not authorized".

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:<ORG>/<REPO>:environment:development"
      }
    }
  }]
}
```

Para `staging` cambia el `sub` a `...:environment:staging`; para `prod` a
`...:environment:production`. (Si en el wizard de la consola rellenaste el campo *Branch*,
genera la condición por rama equivocada — edítala a `environment:<name>` en la pestaña
Trust relationships del role.)

Permisos del role (policy de permisos): SST/Pulumi crea VPC, ECS, API Gateway, Lambda,
S3 (state), SSM, IAM, etc. Lo simple es `AdministratorAccess`; lo correcto en prod es una
policy a medida. Empieza con Administrator y endurece después.

```bash
aws iam create-role --role-name gha-deploy-dev \
  --assume-role-policy-document file://trust-dev.json
aws iam attach-role-policy --role-name gha-deploy-dev \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
# Repite para gha-deploy-staging y gha-deploy-prod con sus trust policies.
```

Anota los ARN resultantes (`arn:aws:iam::<ACCOUNT_ID>:role/gha-deploy-<env>`).

## 2. GitHub Environments

En **Settings → Environments** crea tres: `development`, `staging`, `production`.

En cada uno añade una **Environment variable** (no secret — el ARN no es sensible):

| Environment | Variable | Valor |
|---|---|---|
| `development` | `AWS_DEPLOY_ROLE_ARN` | ARN de `gha-deploy-dev` |
| `staging` | `AWS_DEPLOY_ROLE_ARN` | ARN de `gha-deploy-staging` |
| `production` | `AWS_DEPLOY_ROLE_ARN` | ARN de `gha-deploy-prod` |

En **`production`** (recomendado) activa **Required reviewers** y agrega al equipo que
aprueba prod. Con esto, el push a `main` despliega pero **queda en pausa** esperando
aprobación manual antes de tocar producción.

### 2.1 Variables de entorno del deploy

El infra lee config de `process.env` al sintetizar (en local viene del `.env`, que está
en `.gitignore` y NO llega al runner). `requireSharedEnv` **rompe el deploy** en
dev/staging/prod si falta una. Hay que proveerlas a GitHub Actions, en dos niveles:

**a) Compartidas entre stages** → a **nivel repo**
(Settings → Secrets and variables → **Actions**):

| Nombre | Tipo | Para qué |
|---|---|---|
| `NEON_ORG_ID` | Variable | Org de Neon donde se crea el proyecto. |
| `NEON_API_KEY` | Secret | Autentica el provider Neon (API key org-scoped dedicada a CI). |

**b) Distintas por stage** → en cada **GitHub Environment**
(`development`/`staging`/`production`), porque cada stage usa su tenant Auth0 y su URL.
Las no sensibles van como **Variables**; las sensibles como **Secrets** (misma caja del
Environment, distinta pestaña):

| Nombre | Tipo | Para qué |
|---|---|---|
| `AUTH0_DOMAIN` | Variable (env) | Tenant Auth0 del stage. |
| `AUTH0_CLIENT_ID` | Variable (env) | App Auth0 del stage (web). |
| `AUTH0_AUDIENCE` | Variable (env) | API audience del stage. |
| `APP_BASE_URL` | Variable (env) | URL pública del web del stage (redirect_uri del callback). |
| `AUTH0_CLIENT_SECRET` | **Secret** (env) | Client secret del tenant (sensible). |
| `AUTH0_SECRET` | **Secret** (env) | Cifra la cookie de sesión Next.js (`openssl rand -hex 32`). |

Los workflows de deploy ya inyectan todas vía `env:`. **Para `dev`, copia los valores de tu
`.env` local** (los que hicieron funcionar `sst deploy --stage dev`); para staging/prod usa
los de su tenant/URL.

> **Bootstrap de `APP_BASE_URL`**: en el primer deploy de un stage la URL aún no existe. Pon
> un placeholder (p.ej. `http://localhost:3000`), deja que el deploy genere la URL real
> (output `webUrl`), actualiza la variable y re-despliega. (Custom domains por stage
> eliminarían este paso — ver `ROADMAP.md`.)

No usadas en CI: `NEON_DEV_PROJECT_ID` y `SHARED_DEV_VPC_ID` son solo para stages
**personales** (dev/staging/prod crean su propia VPC y proyecto Neon). `AUTH0_NAMESPACE`
tiene default.

## 3. Branch protection

En **Settings → Branches** protege `dev`, `test` y `main`:

- Require a pull request before merging (≥1 approval en `test`/`main`).
- Require status checks to pass → selecciona el check **PR Checks**.
- Require branches to be up to date.
- Require linear history (squash merge).

## 4. Gestión de credenciales — una sola fuente de verdad

**Todas** las credenciales se manejan como **env vars** (`process.env`), sin SSM ni comandos
aparte. El código del infra y de las apps lee `process.env` igual en local y en deploy:

| Dónde corre | De dónde sale el env |
|---|---|
| Local (`sst dev`, `pnpm dev`) | tu `.env` (en `.gitignore`) |
| CI (deploy) | Variables/Secrets del repo y del GitHub Environment |

Regla: **¿es sensible?** → GitHub **Secret**; **¿no?** → GitHub **Variable**. **¿igual en todo
stage?** → nivel repo; **¿distinto por stage?** → nivel Environment. Eso es todo (ver tablas §2.1).

> **Escape-hatch opcional (SSM):** si un proyecto concreto necesita que un secreto NO pase por
> CI (encriptado en AWS, leído por la app en runtime), puede declararlo en `SECRETS_MANIFEST`
> ([`infra/src/shared/secrets.ts`](../infra/src/shared/secrets.ts), hoy vacío) y setearlo con
> `pnpm sst secret set <Name> <value> --stage <stage>`. La base no lo usa.

## 5. Caché (opcional, recomendado)

Para CI < 5 min, activa **Turbo Remote Cache** (gratis con Vercel): `npx turbo login &&
npx turbo link`, y expón `TURBO_TOKEN` (secret) + `TURBO_TEAM` (variable) a nivel repo;
el composite action ya cachea el store de pnpm.

## Checklist

- [ ] OIDC provider creado en la cuenta AWS.
- [ ] 3 IAM roles con trust policy por `environment` + permisos de deploy.
- [ ] 3 GitHub Environments con `AWS_DEPLOY_ROLE_ARN`.
- [ ] `NEON_ORG_ID` (variable) + `NEON_API_KEY` (secret) a nivel repo.
- [ ] Por Environment: `AUTH0_DOMAIN`/`AUTH0_CLIENT_ID`/`AUTH0_AUDIENCE`/`APP_BASE_URL` (variables) + `AUTH0_CLIENT_SECRET`/`AUTH0_SECRET` (secrets).
- [ ] Required reviewers en `production`.
- [ ] Branch protection en `dev`/`test`/`main` con el check PR Checks.
- [ ] Secrets obligatorios seteados en cada stage compartido.
