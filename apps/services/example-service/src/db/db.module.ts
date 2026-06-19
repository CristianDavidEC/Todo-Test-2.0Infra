import { Module } from "@nestjs/common";
import { getPostgresClient, UsersRepository } from "@app/db";

/**
 * Capa de composición de acceso a datos.
 *
 * `@app/db` se mantiene libre de SST (regla de capas): aquí resolvemos la
 * connection string desde `process.env.DATABASE_URL`, que la infra inyecta
 * como env var en el servicio ECS (ver infra/src/services/workers.ts) y que
 * en local viene del `.env`.
 *
 * El cliente Postgres es cacheado por `getPostgresClient`; en ECS usa el pool
 * TCP `pg` (detección automática por ausencia de AWS_LAMBDA_FUNCTION_NAME).
 */
@Module({
  providers: [
    {
      provide: UsersRepository,
      useFactory: () => new UsersRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
  ],
  exports: [UsersRepository],
})
export class DbModule {}
