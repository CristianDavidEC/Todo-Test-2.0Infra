/**
 * @todo-list-poc-infra/db
 *
 * Capa de acceso a datos. Postgres (Drizzle) es el único datastore de la base.
 *
 * Convenciones:
 * - Lambdas usan el driver HTTP de Neon (serverless); ECS usa pool TCP `pg`. La
 *   detección es automática (`getPostgresClient()` mira `AWS_LAMBDA_FUNCTION_NAME`).
 * - Schema en `adapters/postgresql/schema.ts` es la source of truth; migrations se
 *   generan con `pnpm db:generate` (drizzle-kit).
 * - Cada dominio expone un Repository class. Importar la clase, no la tabla cruda.
 *
 * ¿Necesitas un datastore documental (MongoDB) o RBAC por BD? No vienen en la base
 * por simplicidad — añádelos por proyecto siguiendo las recetas de packages/db/AGENTS.md.
 */

export {
  getPostgresClient,
  supportsTransactions,
  withTransaction,
  users,
  workspaces,
  workspaceMemberships,
  UsersRepository,
  WorkspacesRepository,
  assertKeepsAnOwner,
  LastOwnerError,
  MembershipNotFoundError,
  wasJustCreated,
  schema,
} from "./adapters/postgresql";
export type {
  PostgresClient,
  PostgresTransaction,
  UserRow,
  NewUserRow,
  LazyUpsertInput,
  WorkspaceRow,
  NewWorkspaceRow,
  WorkspaceMembershipRow,
  NewWorkspaceMembershipRow,
  WorkspaceRole,
  CreateWorkspaceInput,
  WorkspaceWithRole,
  WorkspaceMemberRow,
} from "./adapters/postgresql";
