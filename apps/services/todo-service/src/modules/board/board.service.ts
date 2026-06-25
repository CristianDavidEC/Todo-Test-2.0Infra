import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BoardsRepository,
  ColumnsRepository,
  ColumnNotEmptyError,
  ColumnNotFoundError,
  ProjectsRepository,
  TaskNotFoundError,
  TasksRepository,
  WipLimitError,
  WorkspacesRepository,
  type BoardColumnRow,
  type BoardRow,
  type TaskPriority,
  type TaskRow,
} from "@todo-list-poc-infra/db";
import { AiInsightsService } from "../ai/ai-insights.service";
import type {
  BoardDto,
  BoardInsightsDto,
  BoardWithColumnsDto,
  ColumnDto,
  CreateColumnDto,
  CreateTaskDto,
  MoveTaskDto,
  TaskDto,
  UpdateColumnDto,
  UpdateTaskDto,
} from "./board.dto";

/**
 * Lógica del recurso `board` (M4). Valida que el proyecto pertenezca al workspace
 * (aislamiento de tenant → 404), auto-provisiona el board, y orquesta columnas/tareas.
 * Mapea rows→DTO y traduce errores de dominio. El move escribe historia ⚠️ (en el repo).
 */
@Injectable()
export class BoardService {
  constructor(
    @Inject(BoardsRepository) private readonly boardsRepo: BoardsRepository,
    @Inject(ColumnsRepository) private readonly columnsRepo: ColumnsRepository,
    @Inject(TasksRepository) private readonly tasksRepo: TasksRepository,
    @Inject(ProjectsRepository) private readonly projectsRepo: ProjectsRepository,
    @Inject(WorkspacesRepository) private readonly workspacesRepo: WorkspacesRepository,
    @Inject(AiInsightsService) private readonly ai: AiInsightsService,
  ) {}

  /** Resuelve el board del proyecto validando que el proyecto ∈ workspace (404 si no). */
  private async resolveBoard(workspaceId: string, projectId: string): Promise<BoardRow> {
    const project = await this.projectsRepo.findByIdInWorkspace(workspaceId, projectId);
    if (!project) throw new NotFoundException("Proyecto no encontrado");
    return this.boardsRepo.getOrCreate(projectId);
  }

  async getBoard(workspaceId: string, projectId: string): Promise<BoardWithColumnsDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const [columns, tasks] = await Promise.all([
      this.columnsRepo.listForBoard(board.id),
      this.tasksRepo.listForBoard(board.id),
    ]);
    return {
      board: toBoard(board),
      columns: columns.map(toColumn),
      tasks: tasks.map(toTask),
    };
  }

  async createColumn(
    workspaceId: string,
    projectId: string,
    dto: CreateColumnDto,
  ): Promise<ColumnDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const row = await this.columnsRepo.create({
      boardId: board.id,
      name: dto.name,
      wipLimit: dto.wipLimit ?? null,
    });
    return toColumn(row);
  }

  async updateColumn(
    workspaceId: string,
    projectId: string,
    columnId: string,
    patch: UpdateColumnDto,
  ): Promise<ColumnDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const row = await this.columnsRepo.update(board.id, columnId, patch);
    if (!row) throw new NotFoundException("Columna no encontrada");
    return toColumn(row);
  }

  async deleteColumn(workspaceId: string, projectId: string, columnId: string): Promise<void> {
    const board = await this.resolveBoard(workspaceId, projectId);
    try {
      const ok = await this.columnsRepo.delete(board.id, columnId);
      if (!ok) throw new NotFoundException("Columna no encontrada");
    } catch (err) {
      if (err instanceof ColumnNotEmptyError) throw new ConflictException(err.message);
      throw err;
    }
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const column = await this.columnsRepo.findByIdInBoard(board.id, dto.columnId);
    if (!column) throw new BadRequestException("La columna no pertenece al tablero");
    await this.assertAssigneeIsMember(workspaceId, dto.assigneeId);
    const row = await this.tasksRepo.create({
      projectId,
      boardId: board.id,
      columnId: dto.columnId,
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority as TaskPriority | undefined,
      assigneeId: dto.assigneeId ?? null,
      estimate: dto.estimate ?? null,
      labels: dto.labels,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy: userId,
    });
    return toTask(row);
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    patch: UpdateTaskDto,
  ): Promise<TaskDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    if (patch.assigneeId !== undefined) {
      await this.assertAssigneeIsMember(workspaceId, patch.assigneeId);
    }
    const row = await this.tasksRepo.update(board.id, taskId, {
      title: patch.title,
      description: patch.description,
      priority: patch.priority as TaskPriority | undefined,
      assigneeId: patch.assigneeId,
      estimate: patch.estimate,
      labels: patch.labels,
      dueDate: patch.dueDate === undefined ? undefined : patch.dueDate ? new Date(patch.dueDate) : null,
    });
    if (!row) throw new NotFoundException("Tarea no encontrada");
    return toTask(row);
  }

  async archiveTask(workspaceId: string, projectId: string, taskId: string): Promise<void> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const row = await this.tasksRepo.archive(board.id, taskId);
    if (!row) throw new NotFoundException("Tarea no encontrada");
  }

  /** Mueve una tarjeta (⚠️ escribe historia + respeta WIP). */
  async moveTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    dto: MoveTaskDto,
  ): Promise<TaskDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    try {
      const row = await this.tasksRepo.move(
        board.id,
        taskId,
        dto.toColumnId,
        dto.position,
        userId,
      );
      return toTask(row);
    } catch (err) {
      if (err instanceof WipLimitError) throw new ConflictException(err.message);
      if (err instanceof ColumnNotFoundError) throw new BadRequestException(err.message);
      if (err instanceof TaskNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  async getInsights(workspaceId: string, projectId: string): Promise<BoardInsightsDto> {
    const board = await this.resolveBoard(workspaceId, projectId);
    const [columns, tasks] = await Promise.all([
      this.columnsRepo.listForBoard(board.id),
      this.tasksRepo.listForBoard(board.id),
    ]);
    return this.ai.analyzeBoard(columns, tasks);
  }

  /** El responsable debe ser miembro del workspace (BR-7). null = sin responsable. */
  private async assertAssigneeIsMember(
    workspaceId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (!assigneeId) return;
    const membership = await this.workspacesRepo.findByIdForUser(workspaceId, assigneeId);
    if (!membership) {
      throw new BadRequestException("El responsable debe ser miembro del workspace");
    }
  }
}

function toBoard(row: BoardRow): BoardDto {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toColumn(row: BoardColumnRow): ColumnDto {
  return {
    id: row.id,
    boardId: row.boardId,
    name: row.name,
    position: row.position,
    wipLimit: row.wipLimit,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTask(row: TaskRow): TaskDto {
  return {
    id: row.id,
    projectId: row.projectId,
    boardId: row.boardId,
    columnId: row.columnId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    assigneeId: row.assigneeId,
    estimate: row.estimate,
    position: row.position,
    labels: row.labels,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    sprintId: row.sprintId,
    createdBy: row.createdBy,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
