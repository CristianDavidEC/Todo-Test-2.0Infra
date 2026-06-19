<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `infra` (SST v4 / Ion + Pulumi)

Infraestructura como código del monorepo. Todo recurso AWS/Neon vive aquí.
Ver también el [`AGENTS.md` raíz](../AGENTS.md).

## Scope

- **SST v4 (Ion)** sobre Pulumi. Providers: `aws` (pin `us-east-1`) + `neon`.
- [`sst.config.ts`](../sst.config.ts) (raíz) solo define `app()` y **delega**: `run()` hace `import("./infra/src/app")`. Lo único que vive ahí además del `app()` es el nombre canónico (`APP_NAME`), los `defaultTags` y la política de removal. No metas recursos en `sst.config.ts`.
- **Tipos REALES de SST.** `infra/src` se type-checkea contra los tipos generados por SST: [`src/sst-globals.d.ts`](src/sst-globals.d.ts) referencia `.sst/platform/config.d.ts` (vía el preset `@todo-list-poc-infra/config/tsconfig.sst.json`, sin `rootDir`), exponiendo `sst`/`aws`/`neon`/`$app`/`$dev`/etc. con sus tipos reales — un arg inválido en un componente **falla** el type-check. No hay tipos a mano que mantener.
  **Prerrequisito (`.sst/` está gitignored, un clon nuevo no lo tiene):** corre `pnpm sst install` (genera `.sst/platform`). Además, hasta el primer `sst dev`/`deploy`, crea el stub que `config.d.ts` importa: `echo 'export {};' > .sst/types.generated.ts` (sst lo regenera real al desplegar). Como `.sst/**` queda fuera del hash de Turbo, tras un `sst deploy` o cambio de provider corre `pnpm type-check --force` (si no, sirve caché obsoleta).

## Estructura por dominios

```
src/
  app.ts              → orquestador: importa cada módulo por su side-effect, en orden + exporta `outputs`
  sst-globals.d.ts    → referencia los tipos REALES de SST (.sst/platform), no tipos a mano
  helpers/stage.ts    → clasificación y sizing por stage (ÚNICA fuente)
  helpers/env.ts      → lectura de env vars con fail-fast en stages compartidos
  shared/             → secrets (manifest) · tags   (transversal)
  networking/vpc.ts
  databases/neon.ts   → Neon Postgres (principal)
  apis/main-api.ts    → API Gateway (única superficie pública)
  services/workers.ts → ECS/Fargate (NestJS)
  webs/web.ts         → Next.js (OpenNext)
  storage/ · events/  → stubs (TODO, sin código activo)
```

**Regla:** cada recurso va en su carpeta de dominio. Dominio nuevo → carpeta nueva + `import` en `app.ts` en la fase correcta.

## Patrones (así se escribe infra aquí)

1. **Módulo = side-effect import.** Cada archivo crea sus recursos al ser importado y **exporta** lo que otros necesiten linkar (`vpc`, `database`, `api`…). [`app.ts`](src/app.ts) los importa en **orden estricto**: networking → secrets → databases → storage → events → cómputo (services, apis) → frontend. Añadir un módulo = añadir su `import` en la fase correcta; no se usa una función `register()`.

2. **Config por stage centralizada en [`helpers/stage.ts`](src/helpers/stage.ts) (única fuente).** Nunca dupliques ni hardcodees lógica de stage: usa `isProduction`/`isStaging`/`isPersonalStage`/`isSharedStage`, `getEcsTaskSize`/`getEcsTaskCount`, `getRemovalPolicy`. **Stage personal = cualquiera que NO sea `dev`/`staging`/`prod`** (recibe cleanup automático y recursos mínimos). `sst.config.ts` y `vpc.ts` ya consumen estos helpers — no reimplementes el ternario inline.

3. **Fail-fast en env vars.** Si falta un env requerido (`NEON_ORG_ID`, `SHARED_DEV_VPC_ID`, `NEON_DEV_PROJECT_ID`), lanza `throw new Error` con **instrucciones paso a paso** (ver `neon.ts`/`vpc.ts`). Nada de defaults silenciosos para infra crítica. Para vars compartidas por varios módulos (p.ej. las `AUTH0_*` que inyecta `workers.ts`) usa el helper `requireSharedEnv(name)` ([`helpers/env.ts`](src/helpers/env.ts)): falla temprano en stages compartidos (`dev`/`staging`/`prod`) y deja pasar vacío en stages personales.

4. **Linkable + env-var cruda (frontera anti-SST).** Pasa conexiones al cómputo de dos formas: `sst.Linkable` (`link: [database]`) **y** el `Output` crudo exportado (`databaseUrl`) para inyectar como env var. **`@todo-list-poc-infra/db` y `@todo-list-poc-infra/core` NUNCA importan `sst`** — leen `process.env.DATABASE_URL`. Mantén esa frontera al cablear cómputo nuevo.

5. **Guard `$dev` para recursos que no existen en modo dev.** `routePrivate`/Cloud Map solo se cablean desplegado: `if (!$dev) { … }` (ver `main-api.ts`). En `sst dev` el ECS corre local.

6. **Credenciales = env vars (una sola fuente de verdad).** TODA config y secreto se lee de `process.env`: en local del `.env`, en deploy de las Variables/Secrets del GitHub Environment (ver [`docs/SETUP-CICD.md`](../docs/SETUP-CICD.md)). En stages compartidos usa `requireSharedEnv("X")` (fail-fast si falta). **Escape-hatch opcional:** `SECRETS_MANIFEST` ([`shared/secrets.ts`](src/shared/secrets.ts)) sigue existiendo para meter un secreto en SSM (`sst.Secret`, `pnpm sst secret set`) si un proyecto lo necesita, pero **está vacío por defecto** — la base no usa SSM.

7. **Tags estándar GLOBALES (no recurso por recurso).** [`shared/tags.ts`](src/shared/tags.ts) son funciones puras (`getAllTags(appName, stage)`) que se pasan a `defaultTags.tags` del provider `aws` en `sst.config.ts`; **Pulumi los hereda a cada recurso AWS automáticamente.** No etiquetes recurso por recurso. Para un tag específico (p.ej. `Name` en sub-recursos de la VPC), añádelo en ese recurso vía `transform` — se mergea encima de los globales.

8. **Módulos opt-in.** Un feature opcional (p.ej. el datastore MongoDB documental) se escribe como módulo apagado por defecto: NO se importa desde `app.ts` y documenta su activación inline. Sigue ese patrón al añadir features opcionales.

## Log retention (stage-aware)

`getLogRetention(stage)` ([`helpers/stage.ts`](src/helpers/stage.ts)) está cableado a ECS (`workers.ts` `logging.retention`) y Lambda (`main-api.ts` `transform.route.handler`). SST ya aplica un default de "1 month", así que esto NO es un fix de "logs eternos" — lo hace **stage-aware** ("1 month"/"2 weeks"/"1 week").

## Gotchas

- **`$app.name` = `"todo-list-poc-infra"`** (canónico, en `sst.config.ts` como `APP_NAME`) → se hornea en el nombre de **todo** recurso AWS. **Cambiarlo en un stage ya desplegado fuerza destroy-recreate de todo el stack.**
- **Lambdas SIEMPRE fuera de VPC** (no se les pasa el campo `vpc`); ECS sí va en VPC.
- **`web.ts` fuerza `openNextVersion: "4.0.3"`** — Next 16 usa `proxy.ts`; el default de SST no lo entiende y rompe el build de OpenNext.
- **API Gateway es la única superficie pública**; NestJS queda privado tras VPC Link + Cloud Map (sin ALB).
- **`sst.config.ts` SÍ se type-checkea** (incluido en `infra/tsconfig.json`). Pero **SST prohíbe imports top-level** ahí: usa `await import(...)` dentro de `app()`/`run()`, y solo de módulos PUROS (`shared/tags`, `helpers/stage`) — nada que toque globales `$app` en scope de módulo.

## Trade-offs aceptados conscientemente (ver `ROADMAP.md`)

- **`DATABASE_URL` va como env var en texto plano** en la task ECS (`workers.ts` `environment`), no vía SSM/Secrets Manager. Aceptable para la plantilla; un proyecto con requisitos de compliance debe moverlo a un secret.
- **NAT instance `t4g.nano` también en prod** (no NAT Gateway gestionado). Es un **SPOF de red** asumido a cambio de coste; si prod necesita HA, cámbialo a NAT Gateway.

## Recetas (al añadir…)

- **Ruta Lambda** → `api.route("METHOD /path", { handler, link: [...] })` en `apis/main-api.ts` + handler en `apps/functions`.
- **Endpoint NestJS** → ya cubierto por `ANY /api/{proxy+}`; el código va en `apps/services/example-service`.
- **Cola/evento** → escribir `events/queues.ts` + `import "./events/queues"` en `app.ts` (fase eventos).
- **Credencial nueva** → leerla con `requireSharedEnv("X")` + agregarla al `env:` de los 3 `deploy-*.yml` (Variable si no sensible, Secret si sensible). SSM solo si el proyecto lo justifica (manifest vacío por defecto).
- **Recurso de dominio nuevo** → carpeta + módulo side-effect + import ordenado en `app.ts`.
