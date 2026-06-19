# AGENTS.md — `.github` (CI/CD)

GitHub Actions con **branch-per-environment** + **OIDC** (sin llaves AWS estáticas).
Setup de infra/repo (one-time): [`docs/SETUP-CICD.md`](../docs/SETUP-CICD.md).

## Modelo

| Rama | Stage | Workflow | Trigger |
|---|---|---|---|
| `dev` | `dev` | `deploy-dev.yml` | push |
| `test` | `staging` | `deploy-staging.yml` | push |
| `main` | `prod` | `deploy-prod.yml` | push (gate `production`) |
| cualquiera | — | `pr-checks.yml` | PR a dev/test/main |

Promoción: `feat/* → dev → test → main` por PR.

## Reglas al editar aquí

1. **Setup compartido** = el composite action local [`actions/setup`](actions/setup/action.yml)
   (pnpm + Node 22 + `install --frozen-lockfile`). Todo workflow hace `actions/checkout@v4`
   **antes** de `uses: ./.github/actions/setup` (el repo debe estar en disco para un
   composite local). No dupliques los pasos de setup.
2. **OIDC, no secrets de AWS.** Deploys usan `permissions: id-token: write` +
   `aws-actions/configure-aws-credentials` con `role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}`.
   El ARN vive como **variable del GitHub Environment** (`development`/`staging`/`production`),
   no hardcodeado. Región siempre `us-east-1`.
3. **Un workflow de deploy por ambiente**, atado a su rama y a su `environment:`. Para
   añadir un ambiente nuevo: nueva rama + copia un `deploy-*.yml` + nuevo GitHub Environment
   con su `AWS_DEPLOY_ROLE_ARN`.
4. **`concurrency`**: deploys usan `cancel-in-progress: false` (no abortar un deploy en
   vuelo); `pr-checks` usa `true` (cancela checks viejos del PR).
5. **Comandos = scripts del repo.** Los workflows llaman `pnpm lint/type-check/test/build`,
   `pnpm sst deploy` — no reimplementan lógica en YAML.
6. **Credenciales = env vars, una sola fuente de verdad.** No hay SSM ni `set-secret`. Cada
   deploy inyecta vía `env:` lo que el infra lee de `process.env`: Variables (no sensibles) y
   Secrets (sensibles), a nivel repo si son iguales en todo stage o a nivel Environment si
   difieren. Al añadir una env var nueva que `requireSharedEnv` exija, agrégala al bloque
   `env:` de los 3 deploys. Ver `docs/SETUP-CICD.md` §2.1/§4.

## Gotchas

- El gate de prod se configura en GitHub (Required reviewers del environment `production`),
  no en el YAML — sin reviewers, el deploy a prod es automático.
- **OIDC + `environment:` cambia el claim `sub`**: como los deploys usan `environment:`,
  el token OIDC trae `sub = repo:<org>/<repo>:environment:<name>` (NO `:ref:refs/heads/<branch>`).
  La trust policy del IAM role DEBE filtrar por `environment:<name>`, o falla con
  "Not authorized to perform sts:AssumeRoleWithWebIdentity". Ver `docs/SETUP-CICD.md` §1.2.
- `requireSharedEnv` (infra) **rompe el deploy** en dev/staging/prod si una env var falta —
  por eso toda config/secreto que el synth necesite debe estar en el `env:` del workflow.
- **`pr-checks` corre `pnpm sst install` antes de los checks.** Genera `.sst/platform/config.d.ts`
  (gitignored); sin él, el `type-check` de `@app/infra` falla porque `sst.config.ts` referencia
  esos tipos globales (`sst`, `$app`, `$dev`, `neon`…). En local el archivo persiste de un
  `sst dev` previo, por eso ahí pasa y en CI no. Los deploys NO lo necesitan: `sst deploy`
  regenera la plataforma. `sst install` no toca AWS ni requiere env vars.
