import { defineConfig } from "vitest/config";

/**
 * Preset base de Vitest para los paquetes del monorepo.
 *
 * Un paquete lo consume creando un `vitest.config.ts` que lo re-exporte:
 *   import base from "@app/config/vitest/base";
 *   export default base;
 *
 * y añadiendo `vitest` a devDependencies + un script `"test": "vitest run"`.
 * Los tests viven junto al código como `*.test.ts` / `*.spec.ts`.
 *
 * Coverage gates / reporters quedan fuera de la base (ver ROADMAP.md, Fase 6):
 * se añaden por proyecto cuando haya una suite que los justifique.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
});
