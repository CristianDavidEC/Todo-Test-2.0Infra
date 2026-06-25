import { Module } from "@nestjs/common";
import {
  getPostgresClient,
  BoardsRepository,
  ColumnsRepository,
  InvitationsRepository,
  ProjectsRepository,
  TasksRepository,
  UsersRepository,
  WorkspacesRepository,
} from "@todo-list-poc-infra/db";

/**
 * Capa de composición de acceso a datos.
 *
 * `@todo-list-poc-infra/db` se mantiene libre de SST (regla de capas): aquí resolvemos la
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
    {
      provide: WorkspacesRepository,
      useFactory: () => new WorkspacesRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
    {
      provide: ProjectsRepository,
      useFactory: () => new ProjectsRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
    {
      provide: InvitationsRepository,
      useFactory: () => new InvitationsRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
    {
      provide: BoardsRepository,
      useFactory: () => new BoardsRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
    {
      provide: ColumnsRepository,
      useFactory: () => new ColumnsRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
    {
      provide: TasksRepository,
      useFactory: () => new TasksRepository(getPostgresClient(process.env.DATABASE_URL)),
    },
  ],
  exports: [
    UsersRepository,
    WorkspacesRepository,
    ProjectsRepository,
    InvitationsRepository,
    BoardsRepository,
    ColumnsRepository,
    TasksRepository,
  ],
})
export class DbModule {}
