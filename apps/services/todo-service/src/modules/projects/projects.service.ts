import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectsRepository, type ProjectRow } from "@todo-list-poc-infra/db";
import type {
  CreateProjectDto,
  ProjectDto,
  UpdateProjectDto,
} from "./projects.dto";

/**
 * Lógica del recurso `projects`. Orquesta `ProjectsRepository` (siempre scoped por
 * `workspaceId` → aislamiento de tenant) y mapea filas de BD → DTO (nunca devuelve
 * la fila cruda). No hay errores de dominio que traducir: la unicidad de `key` la
 * impone la BD (23505 → 409 vía `AllExceptionsFilter`); `null`/`undefined` del repo
 * (proyecto inexistente o de otro workspace) → 404.
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(ProjectsRepository) private readonly projectsRepo: ProjectsRepository,
  ) {}

  /** Crea un proyecto en el workspace (BR-1, BR-2). Clave duplicada viva → 409. */
  async create(
    workspaceId: string,
    userId: string,
    body: CreateProjectDto,
  ): Promise<ProjectDto> {
    const row = await this.projectsRepo.create({
      workspaceId,
      name: body.name,
      key: body.key,
      description: body.description ?? null,
      color: body.color,
      status: body.status,
      createdBy: userId,
    });
    return toProject(row);
  }

  /** Proyectos activos del workspace (BR-6: oculta archivados). */
  async listForWorkspace(workspaceId: string): Promise<ProjectDto[]> {
    const rows = await this.projectsRepo.listForWorkspace(workspaceId);
    return rows.map(toProject);
  }

  /** Detalle; 404 si el proyecto no existe o es de otro workspace (BR-5). */
  async getDetail(workspaceId: string, projectId: string): Promise<ProjectDto> {
    const row = await this.projectsRepo.findByIdInWorkspace(workspaceId, projectId);
    if (!row) throw new NotFoundException("Proyecto no encontrado");
    return toProject(row);
  }

  async update(
    workspaceId: string,
    projectId: string,
    patch: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const row = await this.projectsRepo.update(workspaceId, projectId, patch);
    if (!row) throw new NotFoundException("Proyecto no encontrado");
    return toProject(row);
  }

  async archive(workspaceId: string, projectId: string): Promise<ProjectDto> {
    const row = await this.projectsRepo.archive(workspaceId, projectId);
    if (!row) throw new NotFoundException("Proyecto no encontrado");
    return toProject(row);
  }
}

function toProject(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    key: row.key,
    description: row.description,
    status: row.status,
    color: row.color,
    createdBy: row.createdBy,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
