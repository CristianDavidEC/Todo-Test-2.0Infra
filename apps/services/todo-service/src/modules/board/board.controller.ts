import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { BoardService } from "./board.service";
import {
  CreateColumnSchema,
  CreateTaskSchema,
  MoveTaskSchema,
  UpdateColumnSchema,
  UpdateTaskSchema,
} from "./board.dto";

interface AuthedRequest {
  user: User;
}

/**
 * `/api/workspaces/:id/projects/:projectId/board` — Tablero Kanban (M4). Auth0 +
 * membership de workspace (class-level). Escritura: owner/admin/member; lectura
 * (board/insights): cualquier miembro (incl. viewer). El service valida que el
 * proyecto/columna/tarea pertenezcan al tenant (404). El move escribe historia ⚠️.
 */
@ApiTags("board")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
@ApiNotFoundResponse({ description: "Workspace/proyecto no encontrado o sin acceso" })
@ApiParam({ name: "id", format: "uuid", description: "ID del workspace" })
@ApiParam({ name: "projectId", format: "uuid", description: "ID del proyecto" })
@Controller("workspaces/:id/projects/:projectId/board")
@UseGuards(Auth0Guard, WorkspaceMemberGuard)
export class BoardController {
  constructor(@Inject(BoardService) private readonly board: BoardService) {}

  @Get()
  @ApiOperation({ summary: "Obtener tablero", description: "Auto-crea board + columnas si no existe (BR-1)." })
  @ApiOkResponse({ description: "Board + columnas + tareas" })
  getBoard(@Param("id") wsId: string, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.board.getBoard(wsId, projectId);
  }

  @Get("insights")
  @ApiOperation({ summary: "AI Sidekick (heurístico)", description: "Cuellos de botella, sin responsable, sin estimar." })
  @ApiOkResponse({ description: "Insights del tablero" })
  getInsights(@Param("id") wsId: string, @Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.board.getInsights(wsId, projectId);
  }

  @Post("columns")
  @WorkspaceRoles("owner", "admin", "member")
  @ApiOperation({ summary: "Crear columna" })
  @ApiCreatedResponse({ description: "Columna creada" })
  @ApiForbiddenResponse({ description: "Viewer no puede editar" })
  createColumn(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() body: unknown,
  ) {
    const dto = CreateColumnSchema.parse(body);
    return this.board.createColumn(wsId, projectId, dto);
  }

  @Patch("columns/:columnId")
  @WorkspaceRoles("owner", "admin", "member")
  @ApiOperation({ summary: "Editar columna (nombre/WIP/posición)" })
  @ApiParam({ name: "columnId", format: "uuid" })
  @ApiOkResponse({ description: "Columna actualizada" })
  updateColumn(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("columnId", ParseUUIDPipe) columnId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateColumnSchema.parse(body);
    return this.board.updateColumn(wsId, projectId, columnId, dto);
  }

  @Delete("columns/:columnId")
  @WorkspaceRoles("owner", "admin", "member")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Borrar columna", description: "409 si tiene tarjetas (BR-8)." })
  @ApiParam({ name: "columnId", format: "uuid" })
  @ApiConflictResponse({ description: "La columna tiene tarjetas" })
  deleteColumn(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("columnId", ParseUUIDPipe) columnId: string,
  ) {
    return this.board.deleteColumn(wsId, projectId, columnId);
  }

  @Post("tasks")
  @WorkspaceRoles("owner", "admin", "member")
  @ApiOperation({ summary: "Crear tarjeta" })
  @ApiCreatedResponse({ description: "Tarjeta creada" })
  createTask(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const dto = CreateTaskSchema.parse(body);
    return this.board.createTask(wsId, projectId, req.user.id, dto);
  }

  @Patch("tasks/:taskId")
  @WorkspaceRoles("owner", "admin", "member")
  @ApiOperation({ summary: "Editar tarjeta" })
  @ApiParam({ name: "taskId", format: "uuid" })
  @ApiOkResponse({ description: "Tarjeta actualizada" })
  updateTask(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateTaskSchema.parse(body);
    return this.board.updateTask(wsId, projectId, taskId, dto);
  }

  @Post("tasks/:taskId/move")
  @WorkspaceRoles("owner", "admin", "member")
  @ApiOperation({ summary: "Mover tarjeta", description: "Escribe historia ⚠️ y respeta WIP (BR-2/BR-3)." })
  @ApiParam({ name: "taskId", format: "uuid" })
  @ApiOkResponse({ description: "Tarjeta movida" })
  @ApiConflictResponse({ description: "Columna destino llena (WIP)" })
  moveTask(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const dto = MoveTaskSchema.parse(body);
    return this.board.moveTask(wsId, projectId, taskId, req.user.id, dto);
  }

  @Delete("tasks/:taskId")
  @WorkspaceRoles("owner", "admin", "member")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Archivar tarjeta", description: "Soft-delete (BR-6)." })
  @ApiParam({ name: "taskId", format: "uuid" })
  archiveTask(
    @Param("id") wsId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
  ) {
    return this.board.archiveTask(wsId, projectId, taskId);
  }
}
