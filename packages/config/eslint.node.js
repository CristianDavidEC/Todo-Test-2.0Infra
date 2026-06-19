const base = require("./eslint.base.js");

/**
 * Node/Lambda/ECS preset (ESLint 9 flat config).
 * typescript-eslint disables `no-undef` for TS files, so Node globals need no `env`.
 * @type {import("eslint").Linter.Config[]}
 */
module.exports = [...base];
