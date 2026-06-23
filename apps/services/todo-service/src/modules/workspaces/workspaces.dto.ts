/**
 * DTOs del recurso `workspaces`.
 *
 * Zod es la source of truth (regla del monorepo): schemas y tipos viven en
 * `@todo-list-poc-infra/types` y aquí solo se re-exportan. No se re-derivan ZodObjects
 * localmente (evita doble instancia de zod → tipos incompatibles).
 */
export {
  CreateWorkspaceSchema,
  UpdateWorkspaceBrandingSchema,
  AddMemberSchema,
  ChangeRoleSchema,
} from "@todo-list-poc-infra/types";
export type {
  Workspace as WorkspaceDto,
  WorkspaceWithRole as WorkspaceWithRoleDto,
  WorkspaceMember as WorkspaceMemberDto,
  CreateWorkspace as CreateWorkspaceDto,
  UpdateWorkspaceBranding as UpdateWorkspaceBrandingDto,
  AddMember as AddMemberDto,
  ChangeRole as ChangeRoleDto,
  WorkspaceRole,
} from "@todo-list-poc-infra/types";
