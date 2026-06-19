import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type PostgresClient =
  | ReturnType<typeof drizzleHttp<typeof schema>>
  | ReturnType<typeof drizzleNode<typeof schema>>;

type NodeTxCallback = Parameters<NodePgDatabase<typeof schema>["transaction"]>[0];
export type PostgresTransaction = Parameters<NodeTxCallback>[0];

let cached: PostgresClient | undefined;

function isLambda(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getPostgresClient(databaseUrl?: string): PostgresClient {
  if (cached) return cached;

  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida");

  if (isLambda()) {
    const sql = neon(url);
    cached = drizzleHttp(sql, { schema });
  } else {
    const pool = new Pool({ connectionString: url, max: 10 });
    cached = drizzleNode(pool, { schema });
  }

  return cached;
}

/**
 * ¿El runtime actual soporta transacciones interactivas?
 *
 * El driver Neon HTTP (que usamos en Lambda) NO soporta `.transaction()` — lanza en
 * tiempo de ejecución. El pool `pg` (ECS/NestJS) sí. El tipo unión `PostgresClient`
 * oculta esta diferencia, así que cualquier `db.transaction(...)` "pasa" en ECS y
 * truena en producción Lambda. Usa este guard / `withTransaction` para no caer en eso.
 */
export function supportsTransactions(): boolean {
  return !isLambda();
}

/**
 * Ejecuta `fn` dentro de una transacción, o falla TEMPRANO y con un mensaje accionable
 * si el runtime no la soporta (Lambda/Neon HTTP) — en vez del críptico
 * "No transactions support in neon-http driver" que lanzaría el driver.
 *
 * Para lógica transaccional, ubícala en un servicio ECS/NestJS (pool `pg`), o reescríbela
 * a sentencias únicas / CTEs / `onConflict`. Ver `packages/db/AGENTS.md`.
 */
export async function withTransaction<T>(
  db: PostgresClient,
  fn: (tx: PostgresTransaction) => Promise<T>,
): Promise<T> {
  if (!supportsTransactions()) {
    throw new Error(
      "Transacciones no soportadas en el driver Neon HTTP (runtime Lambda). " +
        "Mueve la lógica transaccional a un servicio ECS/NestJS (pool pg), o reescríbela " +
        "a sentencias únicas / CTEs / onConflict. Ver packages/db/AGENTS.md.",
    );
  }
  return (db as NodePgDatabase<typeof schema>).transaction(fn);
}

export { schema };
