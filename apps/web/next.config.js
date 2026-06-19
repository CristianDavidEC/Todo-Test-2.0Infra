// Carga el único .env de la raíz del monorepo (si existe). Reemplaza a
// `node --env-file-if-exists`, que Next no admite porque reenvía los flags de
// arranque vía NODE_OPTIONS (y --env-file* está prohibido ahí). loadEnvFile NO
// pisa variables ya definidas, así que los valores inyectados por SST ganan.
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const rootEnv = resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@app/core",
    "@app/auth",
  ],
};

module.exports = nextConfig;
