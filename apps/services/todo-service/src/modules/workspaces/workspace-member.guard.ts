import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspacesRepository, type WorkspaceWithRole } from "@todo-list-poc-infra/db";
import type { RequestWithAuth } from "@todo-list-poc-infra/auth";
import { WORKSPACE_ROLES_KEY } from "./workspace-roles.decorator";

/** UUID v4-ish; un `:id` malformado se trata como 404 (no se filtra existencia ni se rompe la query). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Request con `params` (Express) y la membership resuelta para reuso del handler. */
interface WorkspaceRequest extends RequestWithAuth {
  params: Record<string, string>;
  membership?: WorkspaceWithRole;
}

/**
 * RBAC por workspace (DB-backed). Corre DESPUÉS de `Auth0Guard` (que pobló `req.user`):
 *
 *   1. Lee `req.user.id` + `:id` de la ruta.
 *   2. `findByIdForUser` → si no hay membership ⇒ **404** (BR-10: no filtra existencia).
 *   3. Adjunta `req.membership` (workspace + rol) para que el handler no re-consulte.
 *   4. Si hay `@WorkspaceRoles(...)` y el rol no coincide ⇒ **403** (BR-4).
 *
 * Una sola query cubre tenant-isolation + autorización por rol.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    @Inject(WorkspacesRepository) private readonly workspacesRepo: WorkspacesRepository,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<WorkspaceRequest>();

    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException("Unauthorized"); // Auth0Guard debe correr antes

    const workspaceId = req.params.id;
    if (!workspaceId || !UUID_RE.test(workspaceId)) {
      throw new NotFoundException("Workspace no encontrado");
    }

    const membership = await this.workspacesRepo.findByIdForUser(workspaceId, userId);
    if (!membership) throw new NotFoundException("Workspace no encontrado");
    req.membership = membership;

    const required = this.reflector.getAllAndOverride<string[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !required.includes(membership.role)) {
      throw new ForbiddenException(`Requiere rol: ${required.join(", ")}`);
    }

    return true;
  }
}
