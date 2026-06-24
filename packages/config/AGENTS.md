<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@todo-list-poc-infra/config`

Presets centrales (tsconfig + eslint + vitest). **Todo el repo extiende de aquí.**
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- **Solo ships archivos de config** — sin `src/`, sin scripts (`type-check`/`lint`/`build`). No añadas scripts aquí.
- Regla de oro: **modifica el preset central, no dupliques `compilerOptions` ni hagas overrides ad-hoc** en cada paquete.
- Lo consume **todo** el repo (apps + packages + infra) vía `extends` / `require`.

## Estructura

```
tsconfig.{base,node,nextjs,nest,sst}.json
eslint.{base,node,nextjs}.js
vitest/base.ts
```

## Patrones

1. **tsconfig: `base` (strict) → variante por runtime.** Elige:
   - `node` — servers/CLI/build (ES2022, esnext, bundler). `apps/functions` lo extiende y añade `types: [node, aws-lambda]` inline (no hay preset `lambda`).
   - `nextjs` — front (libs DOM, `jsx: preserve`, `noEmit`).
   - `nest` — `commonjs` + decorators (`experimentalDecorators`/`emitDecoratorMetadata`).
   - `sst` — infra: **sin `rootDir`**, `noUnusedLocals/Parameters: false` (entra el fuente real de SST al programa). Ver [`infra/AGENTS.md`](../../infra/AGENTS.md).
2. **eslint: `base` → `node`/`nextjs`.** El base trae `recommended` + tseslint, `no-unused-vars`/`no-explicit-any` en `warn`, y triple-slash **off en `.d.ts`**. `nextjs` usa `eslint-config-next` (ya trae sus plugins, no re-registres tseslint). Los servicios NestJS usan el preset `node` (no hay preset `nest`).
3. **vitest: `base`** (`environment: node`, incluye `src/**/*.{test,spec}.ts`; sin coverage gates — están en `ROADMAP.md`; se eliminó el preset `integration`). Ya cableado: la task `test` existe en `turbo.json`, la raíz expone `pnpm test` (`turbo run test`), y `core`/`db`/`observability` ya tienen tests de ejemplo. **Para añadir tests a un paquete:**
   1. `*.test.ts` (o `.spec.ts`) junto al código.
   2. `vitest.config.ts` con `import base from "@todo-list-poc-infra/config/vitest/base"; export default base;`.
   3. En su `package.json`: `"test": "vitest run"` en scripts + `"vitest"` en devDependencies.
   Corre con `pnpm test` (todo el repo) o `pnpm --filter <pkg> test`.

## Gotchas

- `eslint-config-next` es **dependency** (no dev): un paquete que use el preset `nextjs` necesita `@todo-list-poc-infra/config` instalado.
- Cambiar un preset afecta a **todos** los consumidores. La caché de `lint` de Turbo es **local** (solo hashea archivos del paquete), así que tras tocar un preset corre `pnpm lint`/`type-check` con `--force` para no servir caché obsoleta.

## Receta

- **Nuevo runtime/preset** → archivo `tsconfig.<x>.json` / `eslint.<x>.js` aquí + entrada en `exports` de `package.json`. Nunca configures inline en el paquete consumidor.
