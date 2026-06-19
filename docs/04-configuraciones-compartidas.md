# Configuraciones Compartidas (`packages/config`)

El paquete `@app/config` centraliza los presets de **TypeScript**, **ESLint** y **Vitest** para todo el monorepo. Evita duplicación y garantiza consistencia: cada app/paquete extiende de aquí en vez de configurar opciones inline.

> Detalles, gotchas y recetas de este paquete: ver `packages/config/AGENTS.md`.

## Estructura

```
packages/config/
├── tsconfig.base.json      # Opciones comunes (strict, esModuleInterop, etc.). Base de los demás.
├── tsconfig.node.json      # Extiende base. Servers/CLI/build y paquetes backend (ES2022, esnext, bundler).
├── tsconfig.nest.json      # Extiende base. Servicios NestJS (commonjs + decorators).
├── tsconfig.nextjs.json    # Extiende base. Next.js (libs DOM, jsx: preserve, noEmit).
├── tsconfig.sst.json       # Extiende base. Infra SST (sin rootDir; noUnusedLocals/Parameters: false).
├── eslint.base.js          # Reglas comunes (ESLint 9 flat config; exporta un array de configs).
├── eslint.node.js          # Extiende base. Entornos Node.js (incluye los servicios NestJS).
├── eslint.nextjs.js        # Extiende base. Next.js (eslint-config-next / core-web-vitals).
├── vitest/
│   └── base.ts             # Preset base de Vitest (entorno node, include src/**/*.{test,spec}.ts).
└── package.json
```

El campo `exports` del `package.json` es la lista canónica de presets disponibles: `tsconfig.{base,node,nextjs,nest,sst}.json`, `eslint.{base,node,nextjs}.js` y `vitest/base`.

> **ESLint 9 flat config:** cada preset (`eslint.base.js`, `eslint.node.js`, …) exporta un **array** de objetos de configuración (`module.exports = [...]`) que los demás "esparcen" (`...base`). No se usan archivos legacy `.eslintrc.js`. No existe un preset `eslint.nest` separado: los servicios NestJS usan `eslint.node`.

## Cómo usar desde una app o paquete

**TypeScript** — en el `tsconfig.json` de cada app/paquete se hace `extends` por **ruta relativa** (TypeScript no resuelve `extends` con nombres de paquete npm):

```jsonc
// apps/functions y packages/* (types, core, db, auth, observability):
{ "extends": "../../packages/config/tsconfig.node.json" }

// apps/services/* (NestJS) — un nivel más profundo:
{ "extends": "../../../packages/config/tsconfig.nest.json" }

// apps/web (Next.js):
{ "extends": "../../packages/config/tsconfig.nextjs.json" }

// infra (SST):
{ "extends": "../packages/config/tsconfig.sst.json" }
```

> La profundidad de la ruta depende de dónde esté el tsconfig. Para `packages/*` y `apps/*` es `../../packages/config/`; para `apps/services/*/`, un nivel más, `../../../packages/config/`.

**ESLint** — en el `eslint.config.js` (flat config) de cada app/paquete se re-exporta el preset por nombre de paquete (esto sí resuelve vía `exports`):

```js
// apps/functions, packages/* y apps/services/* (NestJS):
module.exports = require("@app/config/eslint.node.js");

// apps/web (Next.js):
module.exports = require("@app/config/eslint.nextjs.js");
```

> El servicio de referencia `apps/services/example-service` usa **`eslint.node.js`** (no hay preset NestJS dedicado).

Si una app necesita opciones específicas, importa el preset y concatena objetos al array sin tocar la base:

```js
module.exports = [
  ...require("@app/config/eslint.node.js"),
  { rules: { /* overrides locales */ } },
];
```

## Testing (Vitest)

El preset `@app/config/vitest/base` configura Vitest (entorno `node`, `globals: true`, busca `src/**/*.{test,spec}.ts`). El task `test` está cableado en Turbo y se invoca con `pnpm test`. Para escribir tests en un paquete, añade su script `test` consumiendo este preset. Lo pendiente de ampliación (integración con Postgres, E2E, gates de coverage en CI) está descrito en [`ROADMAP.md`](../ROADMAP.md); ver también `packages/config/AGENTS.md`.

## Regla de oro

Modifica el **preset central**, no dupliques `compilerOptions` ni hagas overrides ad-hoc en cada paquete. Cambiar un preset afecta a todos los consumidores: tras tocarlo, corre `pnpm lint` / `pnpm type-check` con `--force` para no servir cache obsoleta de Turbo.
