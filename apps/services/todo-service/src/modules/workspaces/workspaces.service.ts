import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LastOwnerError,
  MembershipNotFoundError,
  UsersRepository,
  WorkspacesRepository,
  type WorkspaceMemberRow,
  type WorkspaceRow,
  type WorkspaceWithRole,
} from "@todo-list-poc-infra/db";
import type {
  AddMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceBrandingDto,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceRole,
  WorkspaceWithRoleDto,
} from "./workspaces.dto";

/**
 * Lógica del recurso `workspaces`. Orquesta `WorkspacesRepository` (+ `UsersRepository`
 * para el lookup por email) y mapea filas de BD → DTO (nunca devuelve la fila cruda).
 * Traduce los errores de dominio del repo a `HttpException`:
 *   - `LastOwnerError`         → 409 (BR-5)
 *   - `MembershipNotFoundError`→ 404
 *   - email no registrado      → 404 (BR-6/BR-12)
 *   - duplicado (23505)        → 409 vía `AllExceptionsFilter` (sin try/catch aquí)
 */
@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(WorkspacesRepository) private readonly workspacesRepo: WorkspacesRepository,
    @Inject(UsersRepository) private readonly usersRepo: UsersRepository,
  ) {}

  /** Crea el workspace + membership Owner del creador (BR-1, BR-2). */
  async create(userId: string, body: CreateWorkspaceDto): Promise<WorkspaceWithRoleDto> {
    const row = await this.workspacesRepo.createWithOwner({ ...body, createdBy: userId });
    return toWorkspaceWithRole({ ...row, role: "owner" });
  }

  /** Workspaces activos del usuario, con su rol (BR-8, BR-10). */
  async listForUser(userId: string): Promise<WorkspaceWithRoleDto[]> {
    const rows = await this.workspacesRepo.listForUser(userId);
    return rows.map(toWorkspaceWithRole);
  }

  /** Detalle. El guard ya resolvió la membership → la reusamos (sin re-query). */
  getDetail(membership: WorkspaceWithRole): WorkspaceWithRoleDto {
    return toWorkspaceWithRole(membership);
  }

  async updateBranding(
    workspaceId: string,
    patch: UpdateWorkspaceBrandingDto,
  ): Promise<WorkspaceDto> {
    const row = await this.workspacesRepo.updateBranding(workspaceId, patch);
    return toWorkspace(row);
  }

  async archive(workspaceId: string): Promise<WorkspaceDto> {
    const row = await this.workspacesRepo.archive(workspaceId);
    return toWorkspace(row);
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    const rows = await this.workspacesRepo.listMembers(workspaceId);
    return rows.map(toMember);
  }

  /** Agrega un usuario YA registrado por email, como `member` (BR-6). */
  async addMember(workspaceId: string, body: AddMemberDto): Promise<WorkspaceMemberDto> {
    const user = await this.usersRepo.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException("El usuario debe registrarse primero para ser agregado");
    }
    const membership = await this.workspacesRepo.addMemberByUserId(workspaceId, user.id, "member");
    return toMember({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: "member",
      createdAt: membership.createdAt,
    });
  }

  async changeRole(
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole,
  ): Promise<{ userId: string; role: WorkspaceRole }> {
    try {
      const row = await this.workspacesRepo.changeRole(workspaceId, targetUserId, role);
      return { userId: row.userId, role: row.role as WorkspaceRole };
    } catch (err) {
      throw translateDomainError(err);
    }
  }

  async removeMember(workspaceId: string, targetUserId: string): Promise<void> {
    try {
      await this.workspacesRepo.removeMember(workspaceId, targetUserId);
    } catch (err) {
      throw translateDomainError(err);
    }
  }

  /** Auto-salida del propio usuario (BR-7), con la guarda BR-5. */
  async leave(workspaceId: string, userId: string): Promise<void> {
    try {
      await this.workspacesRepo.leave(workspaceId, userId);
    } catch (err) {
      throw translateDomainError(err);
    }
  }
}

/** Traduce errores de dominio del repo a HttpException; el resto se re-lanza. */
function translateDomainError(err: unknown): unknown {
  if (err instanceof LastOwnerError) return new ConflictException(err.message);
  if (err instanceof MembershipNotFoundError) return new NotFoundException(err.message);
  return err;
}

function toWorkspace(row: WorkspaceRow): WorkspaceDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdBy: row.createdBy,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWorkspaceWithRole(row: WorkspaceWithRole): WorkspaceWithRoleDto {
  return { ...toWorkspace(row), role: row.role as WorkspaceRole };
}

function toMember(row: WorkspaceMemberRow): WorkspaceMemberDto {
  return {
    userId: row.userId,
    email: row.email,
    name: row.name,
    picture: row.picture,
    role: row.role as WorkspaceRole,
    createdAt: row.createdAt.toISOString(),
  };
}
