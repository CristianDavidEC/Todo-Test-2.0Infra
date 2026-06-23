import { SetMetadata } from "@nestjs/common";
import type { WorkspaceRole } from "./workspaces.dto";

/**
 * Exige uno de estos roles DENTRO del workspace (`:id`). Lo lee `WorkspaceMemberGuard`,
 * que compara contra el rol de la membership del usuario (NO contra claims de Auth0).
 *
 * Uso (el guard ya valida membership → 404; sin decorator, basta ser miembro):
 *   @UseGuards(WorkspaceMemberGuard)
 *   @WorkspaceRoles("owner")
 *   patch() { ... }   // member → 403
 */
export const WORKSPACE_ROLES_KEY = "workspace_roles";

export const WorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);
