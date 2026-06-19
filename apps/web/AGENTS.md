<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `apps/web` (frontend Next.js 16)

Guía del frontend. Patrón **generalista**: cualquier frontend del monorepo sigue esta misma
arquitectura (Screaming Architecture sobre el App Router). Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- **Next.js 16 (App Router) + React 19 + Tailwind v4.** Server Components por defecto.
- Desplegado con **OpenNext** vía `sst.aws.Nextjs` (CloudFront + Lambda + S3). Cableado en [`infra/src/webs/web.ts`](../../infra/src/webs/web.ts).
- Auth con **Auth0 SDK v4**: el login se intercepta en el network boundary (`proxy.ts`).
- Consume lógica/auth del monorepo (`@todo-list-poc-infra/core`, `@todo-list-poc-infra/auth`) — **no** reimplementa lógica de negocio en el front.

## Arquitectura: Screaming Architecture

La estructura **grita el dominio**, no el framework. El App Router de Next obliga a tener `app/`
(routing), pero el **dominio vive en `features/<dominio>/`**; las rutas quedan *thin* y solo componen.

```
HTTP → app/<ruta>/page.tsx  (THIN: routing, gate de auth, composición)
            ↓ importa
       features/<dominio>/  (la feature: UI + modelo + lógica del dominio)
            ↓ usa
       components/ (UI compartida)   lib/ (infra compartida: auth0)   @todo-list-poc-infra/* (tipos/lógica)
```

- **`app/`** — routing y composición **solamente**. Una `page.tsx` resuelve el acceso (sesión/redirect) y renderiza la feature. Sin lógica de dominio ni JSX de negocio inline.
- **`features/<dominio>/`** — el dominio: componentes, el view-model (`*.model.ts`), server actions, schemas Zod colocados. Una feature es autocontenida.
- **`components/`** — UI compartida y tonta (sin dominio), reutilizable entre features (p.ej. `auth-nav`).
- **`lib/`** — infra/clients compartidos (p.ej. `auth0.ts`). Sin JSX.

> **Estado actual del scaffold:** solo está scaffoldeada la feature **`dashboard`** como ejemplo del
> patrón; el resto son buckets compartidos + páginas demo (`app/page.tsx`). Al crear tu primer dominio
> real, sigue el ejemplo de abajo: **no** metas la UI/lógica en `app/`.

### Estructura

```
src/
  proxy.ts                         → Auth0 en el network boundary (Next 16; era middleware.ts en 15)
  app/
    layout.tsx                     → root layout (Auth0Provider, header, globals.css)
    page.tsx                       → home pública (demo)
    dashboard/page.tsx             → ruta THIN: gate de auth + compone la feature
    globals.css                    → Tailwind v4
  features/
    dashboard/                     → EJEMPLO del patrón (feature autocontenida)
      dashboard.model.ts           → view-model: sesión Auth0 → { displayName, isAdmin, … }
      dashboard-view.tsx           → UI presentacional (server component, recibe el modelo por props)
  components/auth-nav.tsx          → UI compartida (client component, useUser())
  lib/auth0.ts                     → Auth0Client + isAuth0Configured (infra compartida)
```

### Cómo funciona el ejemplo `dashboard`

1. [`app/dashboard/page.tsx`](src/app/dashboard/page.tsx) (server component, *thin*): si `isAuth0Configured` es false → `DashboardUnconfigured`; si no hay sesión → `redirect("/auth/login")`; si hay sesión → `toDashboardModel(session, …)` y renderiza `<DashboardView {...model} />`.
2. [`features/dashboard/dashboard.model.ts`](src/features/dashboard/dashboard.model.ts): mapea la sesión Auth0 al modelo de la vista (incl. RBAC `isAdmin` claim-based). Lógica de dominio, fuera de la ruta.
3. [`features/dashboard/dashboard-view.tsx`](src/features/dashboard/dashboard-view.tsx): server component **presentacional**, recibe el modelo por props; no toca Auth0 ni env.

## Convenciones clave

- **Server Components por defecto.** `"use client"` SOLO cuando hay interactividad/hooks de browser (estado, efectos, `useUser()`). Mantén los client components en las hojas (p.ej. `auth-nav`), no en layouts/páginas enteras.
- **Datos en el server.** `fetch`/sesión/secrets en server components o server actions. Nunca expongas secretos al cliente; solo `NEXT_PUBLIC_*` llega al browser.
- **Lógica/tipos del monorepo.** Lógica de negocio reutilizable va en `@todo-list-poc-infra/core` (framework-agnóstica), no copiada en el front. Si necesitas schemas Zod compartidos (`@todo-list-poc-infra/types`), añádelo como dep primero (hoy el web no lo consume).
- **Import por subpath para no inflar el bundle.** `@todo-list-poc-infra/auth/nextjs` (no el barrel `@todo-list-poc-infra/auth`) — el barrel arrastra el guard de NestJS al bundle de Next. Patrón a respetar con cualquier paquete multi-runtime.
- **`@/*` = `src/*`** (alias en `tsconfig.json`). Usa `@/features/...`, `@/components/...`, `@/lib/...`.
- **Auth0 inerte sin credenciales.** `isAuth0Configured` (en `lib/auth0.ts`) mantiene el sitio público vivo (no-op) mientras no haya secrets; con secrets el flujo se activa sin cambiar código. Replica ese guard en cualquier página protegida.
- **Estilos: Tailwind v4** (utilidades en JSX). Sin CSS-in-JS ni librerías de componentes pesadas por defecto.

## Ejecución local

Un **único `.env` en la raíz** del monorepo alimenta todo (lo comparten SST, drizzle, servicios y web).
[`next.config.js`](next.config.js) lo carga con `process.loadEnvFile(../../.env)` si existe. **No hay `.env` por app.** (No se usa `node --env-file*`: Next reenvía los flags de arranque vía `NODE_OPTIONS` y `--env-file*` está prohibido ahí.)

```bash
cp .env.example .env                     # desde la raíz (una vez)
pnpm --filter @todo-list-poc-infra/web dev               # http://localhost:3000  (comando general: @todo-list-poc-infra/<frontend>)
```

| Modo | Comando | Env |
|---|---|---|
| **Standalone** (recomendado, loop diario) | `pnpm --filter @todo-list-poc-infra/web dev` | `.env` raíz (lo carga `next.config.js`) |
| **SST** (cableado real: CloudFront/secrets) | `pnpm sst dev --stage <user>` | inyectado por SST (gana sobre `.env`) |

- El **sitio público funciona sin configurar nada**. Para probar **login**, rellena en el `.env` raíz: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`, `APP_BASE_URL=http://localhost:3000`, y los secrets `AUTH0_CLIENT_SECRET` + `AUTH0_SECRET` (`openssl rand -hex 32`).
- Bajo `sst dev` los valores que inyecta SST (incl. `APP_BASE_URL`) **tienen prioridad** sobre el `.env`; `loadEnvFile` no pisa variables ya definidas y no rompe si el archivo no existe.
- En deploy, **tanto la config pública como los 2 secretos** se inyectan vía `process.env` (sin `sst.Secret`/SSM): la config pública desde **GitHub Variables** y los secretos desde **GitHub Environment Secrets**. En local, todo sale del `.env` raíz — ver [`infra/src/webs/web.ts`](../../infra/src/webs/web.ts).

## Cómo crear una feature nueva

1. `src/features/<dominio>/` con su UI (`*-view.tsx`), modelo (`*.model.ts`) y schemas Zod si aplica.
2. La ruta `app/<ruta>/page.tsx` queda **thin**: resuelve acceso/datos y compone `<FeatureView />`.
3. Mutaciones → **server actions** dentro de la feature (no API routes salvo necesidad real).
4. UI genuinamente compartida → `components/`; clients/infra compartida → `lib/`.
5. `pnpm --filter @todo-list-poc-infra/web type-check lint`.

## Anti-patterns

- ❌ Lógica de dominio o JSX de negocio en `app/page.tsx` → va en `features/<dominio>/`; la ruta es thin.
- ❌ Organizar por tipo técnico global (`components/`, `hooks/`, `services/` con TODO dentro) → eso no "grita" el dominio; colócalo por feature.
- ❌ `"use client"` en layouts/páginas completas → empuja el client boundary a las hojas.
- ❌ Importar el barrel `@todo-list-poc-infra/auth` en vez de `@todo-list-poc-infra/auth/nextjs` → infla el bundle con el guard NestJS.
- ❌ Reimplementar lógica de `@todo-list-poc-infra/core` (o redefinir tipos que deberían vivir en un paquete compartido) en el front.
- ❌ Secretos en código cliente o en `NEXT_PUBLIC_*` → secrets solo server-side.
- ❌ `.env` por app → un solo `.env` en la raíz.

## See also

- [`AGENTS.md` raíz](../../AGENTS.md) · `.claude/skills/vercel-react-best-practices/` · `.claude/skills/next-best-practices/`
- `@todo-list-poc-infra/auth` (Auth0/sesión) · `@todo-list-poc-infra/core` (lógica)
- [`infra/src/webs/web.ts`](../../infra/src/webs/web.ts) (OpenNext + Auth0 env/secrets) · `docs/` (arquitectura)
