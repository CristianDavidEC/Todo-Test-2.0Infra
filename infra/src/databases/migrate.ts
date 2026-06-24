/**
 * Migraciones de BD automáticas en cada deploy.
 *
 * Patrón: un recurso Pulumi `command.local.Command` corre `drizzle-kit migrate`
 * DESPUÉS de que Neon creó el proyecto/branch (la dependencia es implícita: el
 * `DATABASE_URL` que inyectamos es el Output `databaseUrl`, así que Pulumi espera
 * a que se resuelva el connection string antes de correr el comando).
 *
 * Se ejecuta en CADA `sst dev` / `sst deploy`, en TODOS los stages (personal,
 * dev, staging, prod), tanto local como en CI — mismo mecanismo en todas partes.
 * Nadie corre migraciones a mano y no hay que tocar los workflows de deploy.
 *
 * ⚠️ Prod: esto corre DDL contra prod en cada push a la rama de prod. Está
 * mitigado por el approval gate del GitHub Environment `production` (el deploy no
 * arranca sin aprobación). Si la migración falla, falla el deploy — intencional.
 *
 * Idempotencia: drizzle-kit registra las migraciones aplicadas en la tabla
 * `__drizzle_migrations`, así que re-correr de más no aplica nada dos veces.
 *
 * `@todo-list-poc-infra/db` sigue SST-free: este módulo (capa infra) le pasa el
 * `DATABASE_URL` por env var; el package solo lee `process.env.DATABASE_URL` vía
 * su drizzle.config.
 *
 * Asunción load-bearing: el comando corre en el runner de CI / la máquina del dev
 * (NO dentro de la VPC) → Neon debe ser alcanzable públicamente por SSL. Es el caso
 * de Neon y es el mismo path que ya usa el `db:migrate` manual, así que se cumple.
 *
 * Nota de ordering: ningún recurso de cómputo declara `dependsOn: [dbMigrate]`, así
 * que en el PRIMER deploy de un stage el cómputo puede levantar contra una BD aún sin
 * migrar por unos segundos. Si tu caso lo requiere, añade ese `dependsOn` al consumidor.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { databaseUrl, neonDb } from "./neon";

// `sst` corre el synth con cwd = raíz del monorepo (donde está sst.config.ts).
const repoRoot = process.cwd();
const migrationsDir = join(repoRoot, "packages/db/migrations");

/**
 * Hash del contenido de `migrations/` (todos los `.sql` + el journal canónico).
 * Cambia cuando se genera/edita una migración → fuerza que el Command re-corra.
 * Si nada cambia entre deploys, el trigger es estable y el comando NO se re-ejecuta.
 */
function hashMigrations(): string {
  const hash = createHash("sha256");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of sqlFiles) hash.update(readFileSync(join(migrationsDir, f)));
  hash.update(readFileSync(join(migrationsDir, "meta/_journal.json")));
  return hash.digest("hex");
}

// Reintentos: un endpoint Neon recién creado (o despertando de scale-to-zero)
// puede tardar unos segundos en aceptar conexiones. drizzle-kit lo despierta,
// pero el primer intento puede fallar por timeout de conexión.
const runMigrations = [
  "for i in 1 2 3 4 5; do",
  "  pnpm --filter @todo-list-poc-infra/db db:migrate && exit 0;",
  '  echo "[db:migrate] intento $i falló, reintentando en 5s..." >&2;',
  "  sleep 5;",
  "done;",
  '  echo "[db:migrate] agotados los reintentos" >&2; exit 1',
].join(" ");

/**
 * Recurso de migración. `triggers` define cuándo re-correr:
 *   - hashMigrations(): nueva migración generada/editada.
 *   - neonDb.id: branch/proyecto recreado (p.ej. dev borra y re-forka su branch
 *     personal) → nuevo id → re-aplica el schema sobre la BD nueva.
 */
export const dbMigrate: command.local.Command = new command.local.Command("DbMigrate", {
  dir: repoRoot,
  interpreter: ["/bin/bash", "-c"],
  create: runMigrations,
  // El connection string del stage. drizzle.config NO sobre-escribe una env var
  // ya presente, así que este valor inyectado gana sobre cualquier .env local.
  environment: {
    DATABASE_URL: databaseUrl,
  },
  triggers: [hashMigrations(), neonDb.id],
});
