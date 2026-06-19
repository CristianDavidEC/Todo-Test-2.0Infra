import { build } from "esbuild";

/**
 * Bundle del servicio NestJS para ECS.
 *
 * Problema que resuelve: los packages workspace `@app/*` exponen su entrypoint
 * como TS source (`main: ./src/index.ts` con re-exports de directorios). `nest
 * build` (tsc) no los bundlea → `node dist/main.js` no puede resolverlos en
 * runtime. Las Lambdas (esbuild de SST) y Next.js (transpilePackages) ya bundlean;
 * aquí hacemos lo mismo para el contenedor.
 *
 * Estrategia: bundlear SOLO los `@app/*` (inline en dist/main.js); externalizar
 * todos los npm deps (se declaran como deps directas del servicio → resuelven en
 * node_modules del contenedor). Evita pitfalls de bundlear NestJS/pino/pg.
 */
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/main.js",
  sourcemap: true,
  // Decoradores NestJS necesitan reflect-metadata; lo externalizamos y se importa
  // en main.ts. `keepNames` evita romper nombres de clase usados por la DI.
  keepNames: true,
  plugins: [
    {
      name: "externalize-non-workspace",
      setup(b) {
        // Specifiers "bare" (no relativos): bundlear @app/*, externalizar el resto
        // (npm deps + node built-ins). Los relativos los bundlea esbuild normal.
        b.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith("@app/")) return null;
          return { path: args.path, external: true };
        });
      },
    },
  ],
});
