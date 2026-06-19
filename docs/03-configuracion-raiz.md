# Configuración Raíz

## `package.json`

```json
{
  "name": "base-apps",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,js,mjs,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules",
    "sst": "sst",
    "deploy": "sst deploy",
    "remove": "sst remove"
  }
}
```

- **Node 22** está fijado por `engines.node` y por el `.nvmrc` (`nvm use`). pnpm `9.15.4` está pineado en `packageManager`.
- `devDependencies` raíz: `sst`, `turbo`, `typescript`, `eslint` y `prettier` (el resto de deps viven en cada workspace).
- Los comandos `sst`/`deploy`/`remove` son atajos; ver los comandos SST más abajo.

## `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "apps/services/*"
  - "packages/*"
  - "infra"
```

`apps/services/*` se declara por separado porque cada servicio Fargate es un workspace independiente dentro de `apps/services/`. Todos los paquetes internos publican bajo el namespace `@app/*` y se referencian con `workspace:*`.

## `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {},
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Notas esenciales de Turborepo

- **`^build`** significa "buildea primero las dependencias internas, luego este paquete" (orden topológico). Es el patrón estándar para `build`.
- **`type-check`** es topológico (`^type-check`): un cambio aguas arriba invalida correctamente el cache de los paquetes que dependen de él (sin verdes en falso) y la dependencia se revisa primero. Cada paquete que exporta tipos debe mantener un script `type-check`.
- **`lint` es local** (sin `dependsOn`): el preset de ESLint no es type-aware, así que cada paquete lintea solo su propio código y su clave de cache depende únicamente de sus archivos locales. Tras tocar un preset compartido en `@app/config`, corre con `--force` para no servir cache obsoleta.
- **`dev`** no se cachea y es persistente (procesos de larga duración como el dev server de Next.js).
- **`outputs`** define qué carpetas cachea Turbo entre runs; `!.next/cache/**` excluye el cache interno de Next.js.
- Filtra por workspace con `--filter`, p. ej. `pnpm --filter @app/web dev` o `turbo run type-check --filter @app/core`.

> El `test` del `package.json` raíz (`turbo run test`) ejecuta los scripts `test` que cada paquete defina sobre el preset `@app/config/vitest/base`. Para los detalles de testing remite a `packages/config/AGENTS.md` y a [`ROADMAP.md`](../ROADMAP.md).

Guía completa de Turborepo (la antigua `docs/turborepo-guia.md` se eliminó): **<https://turborepo.com/docs>**.

## Comandos

```bash
pnpm install
pnpm run build           # turbo run build
pnpm run type-check      # turbo run type-check
pnpm run lint            # turbo run lint
pnpm run test            # turbo run test
pnpm run clean

# Filtros por workspace
pnpm --filter @app/web dev
pnpm --filter @app/core type-check
pnpm --filter @app/db db:generate   # drizzle-kit generate (migraciones)
pnpm --filter @app/db db:migrate
pnpm --filter @app/db db:studio
```

### SST (región pineada a `us-east-1`)

```bash
sst dev --stage <tu-nombre>       # stage personal; nunca uses prod para dev
sst deploy --stage dev|staging|prod
sst remove --stage <tu-nombre>
sst diff --stage <stage>          # diff de cambios antes de desplegar
sst state ...                     # inspección/manipulación del estado
sst secret set <KEY> <value> --stage <stage>
sst secret remove <KEY> --stage <stage>
```

> Los subcomandos de secrets son **singulares** (`sst secret set` / `sst secret remove`). No existen `sst status` ni `sst console` en SST v4.

## Entornos y stages

- **Compartidos:** `dev`, `staging`, `prod` (definidos en `infra/src/helpers/stage.ts`).
- **Personales:** cualquier stage que no sea uno de los tres anteriores (típicamente tu usuario de GitHub); pueden recibir cleanup automático.
- **Producción:** solo `prod` usa `removal: "retain"` y `protect: true` (ver `sst.config.ts`), para evitar pérdida o destrucción accidental de datos.

## Grafo de Dependencias entre Paquetes

```
@app/config        ← Base (sin dependencias internas)
       ↑
@app/types         ← Depende de config
       ↑
@app/core          ← Depende de types + config
@app/db            ← Depende de config
@app/auth          ← Depende de types + config (+ @app/db como peer opcional, type-only)
@app/observability ← Depende de config
       ↑
apps/web               ← Next.js (consume types/core/auth/config)
apps/functions         ← Lambdas (consume observability/config)
apps/services/*        ← NestJS (consume types/core/db/auth/observability/config)
```

> El grafo muestra las dependencias **declaradas** en cada `package.json`. Matiz: hoy el único
> que **importa** `@app/core` en su código es `apps/web`; `example-service` lo declara como dep
> lista-para-usar (ejemplo del molde) pero aún no lo importa. `apps/functions` declara solo
> `@app/observability` (añade los `@app/*` que cada handler necesite).
