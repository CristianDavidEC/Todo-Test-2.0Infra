import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { Config } from "drizzle-kit";

// `drizzle-kit` corre FUERA de SST, así que no recibe la DATABASE_URL inyectada
// por el `link`. Cargamos .env manualmente. Orden de búsqueda (el primero que
// la defina gana; dotenv no sobre-escribe vars ya presentes):
//   1. variable ya exportada en el shell / pasada inline
//   2. packages/db/.env  (local al package)
//   3. .env en la raíz del monorepo
loadEnv(); // ./.env (cwd = packages/db al correr con --filter @app/db)
loadEnv({ path: resolve(process.cwd(), "../../.env") }); // raíz del monorepo

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL no está definida.\n" +
      "Ponla en packages/db/.env o en el .env de la raíz, o pásala inline:\n" +
      '  DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" pnpm --filter @app/db db:migrate\n' +
      "Es el connection string de tu branch Neon (o del proyecto dev). Ver docs/SETUP-NEON.md.",
  );
}

export default {
  schema: "./src/adapters/postgresql/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config;
