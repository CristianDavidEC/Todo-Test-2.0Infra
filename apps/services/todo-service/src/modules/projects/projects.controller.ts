import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { User } from "@todo-list-poc-infra/types";
import { Auth0Guard } from "../../auth/auth0.guard";
import { WorkspaceMemberGuard } from "../workspaces/workspace-member.guard";
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator";
import { ProjectsService } from "./projects.service";
import { CreateProjectSchema, UpdateProjectSchema } from "./projects.dto";

interface AuthedRequest {
  user: User; // poblado por Auth0Guard (class-level)
}

const PROJECT_EXAMPLE = {
  id: "33333333-3333-3333-3333-333333333333",
  workspaceId: "22222222-2222-2222-2222-222222222222",
  name: "Lanzamiento App",
  key: "APP",
  description: "Proyecto del lanzamiento de la app móvil",
  status: "active",
  color: "#e040a0",
  createdBy: "11111111-1111-1111-1111-111111111111",
  archivedAt: null,
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
};

/**
 * `/api/workspaces/:id/projects` — Proyectos dentro de un workspace (M2). JWT Auth0
 * obligatorio + membership del workspace (class-level: Auth0Guard → WorkspaceMemberGuard).
 * El RBAC reusa el rol de workspace: gestión solo-Owner (`@WorkspaceRoles('owner')`),
 * lectura para cualquier miembro. El aislamiento de tenant lo da el repo (scoped por
 * `:id` + `:projectId` → 404 si el proyecto es de otro workspace). Body con Zod (`.parse`
 * → ZodError → 400 vía `AllExceptionsFilter`).
 */
@ApiTags("projects")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
@ApiNotFoundResponse({ description: "El workspace no existe o no eres miembro" })
@ApiParam({ name: "id", format: "uuid", description: "ID del workspace" })
@Controller("workspaces/:id/projects")
@UseGuards(Auth0Guard, WorkspaceMemberGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Post()
  @WorkspaceRoles("owner", "admin")
  @ApiOperation({ summary: "Crear proyecto", description: "Solo Owner del workspace (BR-2)." })
  @ApiCreatedResponse({ description: "Proyecto creado", schema: { example: PROJECT_EXAMPLE } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiConflictResponse({ description: "Ya existe un proyecto con esa clave en el workspace (BR-3)" })
  create(@Param("id") workspaceId: string, @Req() req: AuthedRequest, @Body() body: unknown) {
    const dto = CreateProjectSchema.parse(body);
    return this.projects.create(workspaceId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Listar proyectos", description: "Activos del workspace (BR-6)." })
  @ApiOkResponse({ description: "Lista de proyectos", schema: { example: [PROJECT_EXAMPLE] } })
  list(@Param("id") workspaceId: string) {
    return this.projects.listForWorkspace(workspaceId);
  }

  @Get(":projectId")
  @ApiOperation({ summary: "Detalle de un proyecto" })
  @ApiParam({ name: "projectId", format: "uuid" })
  @ApiOkResponse({ description: "Proyecto", schema: { example: PROJECT_EXAMPLE } })
  @ApiNotFoundResponse({ description: "No existe en este workspace" })
  getById(
    @Param("id") workspaceId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.getDetail(workspaceId, projectId);
  }

  @Patch(":projectId")
  @WorkspaceRoles("owner", "admin")
  @ApiOperation({ summary: "Editar proyecto", description: "Solo Owner (BR-2)." })
  @ApiParam({ name: "projectId", format: "uuid" })
  @ApiOkResponse({ description: "Proyecto actualizado", schema: { example: PROJECT_EXAMPLE } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "No existe en este workspace" })
  @ApiConflictResponse({ description: "Ya existe un proyecto con esa clave en el workspace (BR-3)" })
  update(
    @Param("id") workspaceId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateProjectSchema.parse(body);
    return this.projects.update(workspaceId, projectId, dto);
  }

  @Delete(":projectId")
  @WorkspaceRoles("owner", "admin")
  @ApiOperation({ summary: "Archivar proyecto", description: "Soft-delete; solo Owner (BR-6)." })
  @ApiParam({ name: "projectId", format: "uuid" })
  @ApiOkResponse({
    description: "Proyecto archivado",
    schema: { example: { ...PROJECT_EXAMPLE, archivedAt: "2026-06-24T00:00:00.000Z" } },
  })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "No existe en este workspace" })
  archive(
    @Param("id") workspaceId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.archive(workspaceId, projectId);
  }
}
