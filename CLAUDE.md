# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` at the repo root is the canonical onboarding doc — read it for monorepo layout, daily workflow commands, and how to add new Lambdas/services. This file (auto-loaded by Claude Code) captures the non-obvious bits **and routes to the per-folder `AGENTS.md` below**.

## AGENTS.md map — read the local one before editing a folder

Every app/package/infra folder has its own `AGENTS.md` with local rules, patterns, and gotchas. They are **not auto-loaded**: before creating or editing files in a folder, read its `AGENTS.md` first (it governs how to work in that area, and overrides general assumptions).

| Working in… | Read |
|---|---|
| repo-wide layout / workflow / adding services | `AGENTS.md` (root) |
| `.github` — CI/CD (workflows, OIDC) | `.github/AGENTS.md` (setup: `docs/SETUP-CICD.md`) |
| `apps/web` — Next.js frontend | `apps/web/AGENTS.md` |
| `apps/functions` — Lambda handlers | `apps/functions/AGENTS.md` |
| `apps/services/*` — NestJS on ECS | `apps/services/AGENTS.md` + the service's own `AGENTS.md` |
| `infra` — SST / Pulumi | `infra/AGENTS.md` |
| `packages/core` (`@todo-list-poc-infra/core`) | `packages/core/AGENTS.md` |
| `packages/types` (`@todo-list-poc-infra/types`) | `packages/types/AGENTS.md` |
| `packages/db` (`@todo-list-poc-infra/db`) | `packages/db/AGENTS.md` |
| `packages/auth` (`@todo-list-poc-infra/auth`) | `packages/auth/AGENTS.md` |
| `packages/observability` (`@todo-list-poc-infra/observability`) | `packages/observability/AGENTS.md` |
| `packages/config` (`@todo-list-poc-infra/config`) | `packages/config/AGENTS.md` |

## Commands

```bash
pnpm install
pnpm run build           # turbo run build  (Next.js + NestJS)
pnpm run type-check      # turbo run type-check
pnpm run lint            # turbo run lint
pnpm run clean
```

Per-package commands use pnpm workspace filters with the `@todo-list-poc-infra/*` namespace:

```bash
pnpm --filter @todo-list-poc-infra/web dev
pnpm --filter @todo-list-poc-infra/core type-check
pnpm --filter @todo-list-poc-infra/example-service dev
pnpm --filter @todo-list-poc-infra/db db:generate   # drizzle-kit generate (migrations)
pnpm --filter @todo-list-poc-infra/db db:migrate
pnpm --filter @todo-list-poc-infra/db db:studio
```

SST (region pinned to `us-east-1`):

```bash
sst dev --stage <your-name>      # personal stage; never use prod for dev
sst deploy --stage dev|prod
sst remove --stage <your-name>
sst secret set <KEY> <value> --stage <stage>
```

Testing is wired minimally: `@todo-list-poc-infra/config` exports a `vitest/base` preset, there is a `test` turbo task + root `pnpm test` script, and a few example tests exist (see `packages/config/AGENTS.md`). The fuller testing vision (integration with ephemeral Neon branches, Playwright e2e, coverage gates) is deferred — see `ROADMAP.md`.

## Turbo task graph (important)

`type-check` uses topological deps (`dependsOn: ["^type-check"]`): a change in an upstream package correctly invalidates its dependents' cache (no stale green), and upstream is checked first. Every package that ships types must keep a `type-check` script. `lint` is local (no deps) — the ESLint preset is not type-aware, so each package's lint reads only its own source and its cache keys on local files alone. `build` follows the standard `^build` topological pattern.

## Architecture

### Workspaces

`pnpm-workspace.yaml` includes `apps/*`, `apps/services/*`, `packages/*`, and `infra`. All internal packages publish under the `@todo-list-poc-infra/` namespace and reference each other with `workspace:*`.

### Layering rules (enforced by convention, not tooling)

- **`@todo-list-poc-infra/core`** is pure business logic. It MUST NOT import `aws-sdk`, `@aws-sdk/*`, `aws-lambda`, `sst`, or `@auth0/*`. It only knows interfaces (e.g. `publisher.interface.ts`); concrete adapters live in their own packages or in the apps. Core is consumable from web, Lambdas, and ECS services alike, though today only `apps/web` actually imports it (`example-service` declares it as a ready-to-use dep; `apps/functions` does not declare it).
- **`@todo-list-poc-infra/types`** holds Zod schemas as the source of truth — TS types are inferred with `z.infer`. Cross-app types go here; single-app types stay local. Domain events use `defineEvent()` for runtime validation.
- **`@todo-list-poc-infra/db`** is Postgres-only (Drizzle) — the base ships a single datastore. `getPostgresClient()` auto-detects runtime: Lambda → Neon HTTP serverless driver; ECS → `pg` TCP pool (detected via `AWS_LAMBDA_FUNCTION_NAME`). **Transaction trap:** the Neon HTTP driver throws on `.transaction()` — use `withTransaction()`/`supportsTransactions()` (it fails early with an actionable message on Lambda) instead of `db.transaction()` directly. `lazyUpsert` is an atomic `onConflictDoUpdate` (no first-login race) that also re-syncs the profile from the JWT. The only table is `users`; RBAC is via Auth0 claims, not DB tables. A MongoDB datastore and DB-backed RBAC are **not** in the base (no consumers) — recipes to add them per-project are in `packages/db/AGENTS.md`. Schema in `adapters/postgresql/schema.ts` is the source of truth; migrations are generated with drizzle-kit. Always import the Repository class, never the raw table.
- **`@todo-list-poc-infra/auth`** is Auth0-only. Auth0 verification uses the public JWKS endpoint (cached ~10min, no network on each request). Custom claims live under a configurable namespace (default `https://app.example.com/`). First authenticated request lazily upserts the user into the `users` table; the boundary maps the row to a **validated Zod `User`** via `rowToUser` (so `req.user` really conforms to `@todo-list-poc-infra/types`). The core authorization logic is **framework-agnostic** (`authorizeRequest`) — each runtime wraps it (the NestJS app defines its own `Auth0Guard`; there is no `createAuth0Guard` factory). Platform deps (`@nestjs/common`, `@auth0/nextjs-auth0`) **and `@todo-list-poc-infra/db`** (type-only) are **optional peerDependencies** so the package can be consumed from Lambda, NestJS, or Next.js (via the `/nextjs` subpath) without dragging unwanted runtimes into the install graph.
- **`@todo-list-poc-infra/observability`** wraps Powertools (Lambda) and Pino (ECS/NestJS/Next.js). Secret **redaction is real on both paths**: Pino uses native `redact` **plus** a `formatters.log` hook running the shared recursive `redactObject` (so deeply-nested secrets are caught, not just shallow paths); Powertools (which has no native redaction) uses the `RedactingLogFormatter` + the same `redactObject`. `correlationId` propagates via `AsyncLocalStorage`: Lambda through `instrumentHandler`; in NestJS the package provides `runWithCorrelation`/the Pino `mixin`, while the actual `correlationMiddleware` lives in the service (`apps/services/example-service/src/logging/`). Outgoing HTTP must read it with `getCorrelationId()` and inject it via `injectCorrelationHeader`.
- **`@todo-list-poc-infra/config`** centralizes tsconfig + eslint presets (`tsconfig.base/node/nextjs/nest/sst.json`, `eslint.base/node/nextjs.js`) and a Vitest preset under `./vitest/base`. Every other package extends from here; do not duplicate compiler options.

### Apps

- `apps/web` — Next.js 16 App Router, React 19, Tailwind 4.
- `apps/functions` — Lambda handlers in `src/handlers/<domain>/<action>.ts` (file is `<action>.ts`; the exported function is named `handler`, so the SST route handler string is `.../<action>.handler`). No framework; types come from `@types/aws-lambda`. Routes are wired in `infra/src/apis/main-api.ts`. Declares only the `@todo-list-poc-infra/*` deps it actually uses (currently `@todo-list-poc-infra/observability`) — add others when a handler needs them.
- `apps/services/<name>` — NestJS 11 services on Fargate, each with its own `Dockerfile` (the reference one is hardened: non-root `node` user, `tini` init, `HEALTHCHECK`, `NODE_ENV=production`). Wired in `infra/src/services/workers.ts`.

### Infrastructure (SST Ion, v4)

`sst.config.ts` delegates to `infra/src/app.ts`, which imports resource modules in a strict order: networking → secrets → databases → compute (services, APIs) → frontend, and exports a `outputs` object that `run()` returns (`vpcId`, `neonProjectId`, `apiUrl`, `webUrl` — used for bootstrap). Currently wired: networking (VPC, with a cheap `t4g.nano` **NAT instance** — not a managed NAT Gateway), secrets, Neon, ECS (NestJS via Cloud Map, with an ECS health check), API Gateway (Lambda `/ping` + private NestJS `/api/*`), and Next.js web. Log retention is stage-aware on Lambda and ECS (`getLogRetention`). `storage/buckets.ts` and `events/queues.ts` are intentionally empty placeholders (not imported) — see `ROADMAP.md`. When adding new infrastructure, place it in the matching subfolder (`apis/`, `databases/`, `events/`, `networking/`, `services/`, `storage/`, `webs/`, `shared/`, `helpers/`) and add the import to `app.ts` in the correct phase.

Stages: each developer uses their own personal stage; `dev` and `staging` are shared (branch `test` → stage `staging`); `prod` is the only stage with `removal: "retain"` (and `protect`). Providers: `aws` (us-east-1) + `neon`.

## Conventions

- TypeScript strict everywhere; do not relax it locally.
- ESLint per-package extends a preset from `@todo-list-poc-infra/config` — modify the central preset rather than ad-hoc overrides.
- Zod schemas are the source of truth for types and validation; do not hand-write parallel TS interfaces.
- New cross-runtime helpers go in `packages/`; runtime-specific glue stays in the app.
- Use `pnpm`, not npm or yarn. `packageManager` is pinned to `pnpm@9.15.4`.

## Skills/agents

`.claude/skills/` contains skills with nested `AGENTS.md` guidance (e.g. `vercel-react-best-practices`, `nestjs-best-practices`, `next-best-practices`, `turborepo`) — consult them when working on the corresponding area.

Architecture deep-dives live in `docs/` (numbered 01–08 plus `ARCHITECTURE.md` as the index; `SETUP-ONBOARDING.md` is the developer getting-started guide, with `SETUP-AUTH0.md`/`SETUP-AWS.md`/`SETUP-NEON.md` for the per-service detail). Deferred/future work is in `ROADMAP.md` (root).