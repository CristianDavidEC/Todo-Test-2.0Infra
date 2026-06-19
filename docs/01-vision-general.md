# Visión General

Este proyecto es la **plantilla base v2.0** (scaffold) de monorepo cloud del equipo: el punto de partida para todos los proyectos nuevos. Es agnóstica al dominio — no implementa una aplicación concreta, sino la infraestructura, los paquetes compartidos y las convenciones sobre las que cada proyecto construye lo suyo.

Combina:

- **Turborepo + pnpm** como sistema de build y gestor de paquetes del monorepo
- **SST v4 (Ion)** como framework de infraestructura como código (usa Pulumi internamente)
- **Next.js 16 + React 19** para el frontend web
- **TypeScript nativo** para handlers Lambda (sin framework, mínimo cold start)
- **NestJS 11** sobre Fargate (ECS) para servicios de API de larga duración
- **Paquetes compartidos** (`@app/*`) para tipos, lógica de negocio, acceso a datos, autenticación, observabilidad y configuraciones

---

## Decisiones de Diseño

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Gestor de monorepo | Turborepo + pnpm | Más ligero que NX, cacheo nativo, configuración mínima. Equipo pequeño. |
| IaC | SST v4 (Ion) | Gestión de estado propia, dev en vivo, componentes de alto nivel para AWS. Usa Pulumi internamente. |
| Paradigma backend | NestJS (ECS) para API/CRUD + Lambdas para async/eventos | Servicios de larga duración con DI y módulos; Lambdas solo para trabajo asíncrono y eventos, con mínimo overhead de cold start. |
| Bundling Lambda | esbuild (vía SST) | Tree-shaking automático, bundle independiente por handler. |
| Base de datos | PostgreSQL (Neon + Drizzle) | Postgres primario/default, branching por desarrollador en Neon. Schema versionado con drizzle-kit. |
| Autenticación | Auth0 (only) | Verificación de JWT vía JWKS público, sync lazy del usuario a Postgres. Multi-runtime (Lambda / NestJS / Next.js). |
| Entornos | dev / staging / prod (compartidos) + stages personales | Aislamiento de cargas; cada desarrollador despliega su propio stage. Solo `prod` usa `removal: "retain"` + `protect`. |
| Scope del monorepo | `@app/*` | Namespace común para todos los paquetes internos, referenciados con `workspace:*`. |

---

## Prerequisitos

Antes de trabajar con este proyecto, asegúrate de tener instalado:

- **Node.js 22** — usa `nvm` con el `.nvmrc` del repo (`nvm use`). El `package.json` raíz pinea `engines.node >= 22` y los Dockerfile usan `node:22-alpine`.
- **pnpm 9.15.4** — pineado en `packageManager`. Instálalo con Corepack (`corepack enable`) o `npm install -g pnpm@9.15.4`. No uses npm ni yarn.
- **Docker** (para construir/levantar servicios Fargate; ver `docker-compose.yml`).
- **AWS CLI** v2 configurado para las cuentas/perfiles correspondientes.
- **SST** se usa desde el proyecto vía el devDependency `sst` (no requiere instalación global). Región pineada a `us-east-1`.

---

## Documentación relacionada

- [`AGENTS.md`](../AGENTS.md) (raíz) — layout del monorepo, workflow diario y cómo añadir servicios/Lambdas.
- [02 — Estructura del proyecto](./02-estructura-proyecto.md) — fuente canónica del árbol de carpetas.
- [03 — Configuración raíz](./03-configuracion-raiz.md) — `package.json`, `turbo.json`, `pnpm-workspace.yaml`.
- [04 — Configuraciones compartidas](./04-configuraciones-compartidas.md) — presets de `@app/config`.
- [`ROADMAP.md`](../ROADMAP.md) — lo que la base deja deliberadamente fuera (testing E2E, CI/CD, MongoDB, RBAC por BD, etc.).
