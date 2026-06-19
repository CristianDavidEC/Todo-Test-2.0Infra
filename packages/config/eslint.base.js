const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

/**
 * Base flat config (ESLint 9). Other presets spread this array.
 * @type {import("eslint").Linter.Config[]}
 */
module.exports = [
  { ignores: ["**/dist/**", "**/.next/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Los .d.ts ambientales pueden usar triple-slash references: es el modo
    // canónico de referenciar tipos generados (p.ej. infra/src/sst-globals.d.ts
    // → tipos reales de SST). Un `import` no traería su `declare global`.
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];
