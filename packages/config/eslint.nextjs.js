const next = require("eslint-config-next/core-web-vitals");

/**
 * Next.js preset (ESLint 9 flat config). eslint-config-next bundles the Next,
 * React and @typescript-eslint plugins, so we only graft our shared overrides on
 * top (rather than spreading the base preset and re-registering @typescript-eslint).
 * @type {import("eslint").Linter.Config[]}
 */
module.exports = [
  { ignores: ["**/dist/**", "**/.next/**"] },
  ...next,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
