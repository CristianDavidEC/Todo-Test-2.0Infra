import { and, asc, count, eq, isNull } from "drizzle-orm";
import {
  boardColumns,
  boards,
  taskStatusHistory,
  tasks,
  type BoardColumnRow,
  type BoardRow,
  type TaskRow,
} from "./schema";
import { withTransaction, type PostgresClient, type PostgresTransaction } from "./client";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface CreateColumnInput {
  boardId: string;
  name: string;
  wipLimit?: number | null;
}
export interface UpdateColumnPatch {
  name?: string;
  wipLimit?: number | null;
  position?: number;
}
export interface CreateTaskInput {
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  estimate?: number | null;
  labels?: string[];
  dueDate?: Date | null;
  createdBy: string;
}
export interface UpdateTaskPatch {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  estimate?: number | null;
  labels?: string[];
  dueDate?: Date | null;
}

/** La columna destino del move no pertenece al board (o no existe). */
export class ColumnNotFoundError extends Error {
  constructor() {
    super("Columna no encontrada en el tablero");
    this.name = "ColumnNotFoundError";
  }
}
/** Mover excedería el WIP limit de la columna destino (BR-3). */
export class WipLimitError extends Error {
  constructor() {
    super("La columna alcanzó su límite WIP");
    this.name = "WipLimitError";
  }
}
/** La tarea no existe en el board. */
export class TaskNotFoundError extends Error {
  constructor() {
    super("Tarea no encontrada");
    this.name = "TaskNotFoundError";
  }
}
/** Intento de borrar una columna con tarjetas vivas (BR-8). */
export class ColumnNotEmptyError extends Error {
  constructor() {
    super("La columna tiene tarjetas; muévelas antes de borrarla");
    this.name = "ColumnNotEmptyError";
  }
}

const DEFAULT_COLUMNS = ["To Do", "Doing", "Done"];

/** Board (1 por proyecto), con auto-provisión perezosa de columnas default. */
export class BoardsRepository {
  constructor(private readonly db: PostgresClient) {}

  async getByProject(projectId: string): Promise<BoardRow | null> {
    const rows = await this.db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Devuelve el board del proyecto; si no existe, crea board + 3 columnas (BR-1). */
  async getOrCreate(projectId: string): Promise<BoardRow> {
    const existing = await this.getByProject(projectId);
    if (existing) return existing;

    return withTransaction(this.db, async (tx) => {
      const [created] = await tx
        .insert(boards)
        .values({ projectId, name: "Tablero" })
        .onConflictDoNothing({ target: boards.projectId })
        .returning();
      if (!created) {
        // Carrera: otro request lo creó; reusar.
        const rows = await tx
          .select()
          .from(boards)
          .where(eq(boards.projectId, projectId))
          .limit(1);
        return rows[0];
      }
      await tx.insert(boardColumns).values(
        DEFAULT_COLUMNS.map((name, i) => ({ boardId: created.id, name, position: i })),
      );
      return created;
    });
  }
}

export class ColumnsRepository {
  constructor(private readonly db: PostgresClient) {}

  async listForBoard(boardId: string): Promise<BoardColumnRow[]> {
    return this.db
      .select()
      .from(boardColumns)
      .where(eq(boardColumns.boardId, boardId))
      .orderBy(asc(boardColumns.position));
  }

  async findByIdInBoard(boardId: string, columnId: string): Promise<BoardColumnRow | null> {
    const rows = await this.db
      .select()
      .from(boardColumns)
      .where(and(eq(boardColumns.id, columnId), eq(boardColumns.boardId, boardId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(input: CreateColumnInput): Promise<BoardColumnRow> {
    const [{ max }] = await this.db
      .select({ max: count() })
      .from(boardColumns)
      .where(eq(boardColumns.boardId, input.boardId));
    const [row] = await this.db
      .insert(boardColumns)
      .values({
        boardId: input.boardId,
        name: input.name,
        position: Number(max),
        wipLimit: input.wipLimit ?? null,
      })
      .returning();
    return row;
  }

  async update(
    boardId: string,
    columnId: string,
    patch: UpdateColumnPatch,
  ): Promise<BoardColumnRow | undefined> {
    const set: Partial<Pick<BoardColumnRow, "name" | "wipLimit" | "position">> & {
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.wipLimit !== undefined) set.wipLimit = patch.wipLimit;
    if (patch.position !== undefined) set.position = patch.position;
    const [row] = await this.db
      .update(boardColumns)
      .set(set)
      .where(and(eq(boardColumns.id, columnId), eq(boardColumns.boardId, boardId)))
      .returning();
    return row;
  }

  /** Borra una columna SOLO si no tiene tarjetas vivas (BR-8). */
  async delete(boardId: string, columnId: string): Promise<boolean> {
    return withTransaction(this.db, async (tx) => {
      const col = await tx
        .select({ id: boardColumns.id })
        .from(boardColumns)
        .where(and(eq(boardColumns.id, columnId), eq(boardColumns.boardId, boardId)))
        .limit(1);
      if (!col[0]) return false;
      const [{ c }] = await tx
        .select({ c: count() })
        .from(tasks)
        .where(and(eq(tasks.columnId, columnId), isNull(tasks.archivedAt)));
      if (Number(c) > 0) throw new ColumnNotEmptyError();
      await tx.delete(boardColumns).where(eq(boardColumns.id, columnId));
      return true;
    });
  }
}

export class TasksRepository {
  constructor(private readonly db: PostgresClient) {}

  async listForBoard(boardId: string): Promise<TaskRow[]> {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.boardId, boardId), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.position));
  }

  async findByIdInBoard(boardId: string, taskId: string): Promise<TaskRow | null> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Crea la tarjeta y registra la fila inicial de historia (toColumnId, from=null) ⚠️. */
  async create(input: CreateTaskInput): Promise<TaskRow> {
    return withTransaction(this.db, async (tx) => {
      const [{ c }] = await tx
        .select({ c: count() })
        .from(tasks)
        .where(and(eq(tasks.columnId, input.columnId), isNull(tasks.archivedAt)));
      const [row] = await tx
        .insert(tasks)
        .values({
          projectId: input.projectId,
          boardId: input.boardId,
          columnId: input.columnId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "medium",
          assigneeId: input.assigneeId ?? null,
          estimate: input.estimate ?? null,
          position: Number(c),
          labels: input.labels ?? [],
          dueDate: input.dueDate ?? null,
          createdBy: input.createdBy,
        })
        .returning();
      await tx.insert(taskStatusHistory).values({
        taskId: row.id,
        fromColumnId: null,
        toColumnId: row.columnId,
        byUserId: input.createdBy,
      });
      return row;
    });
  }

  async update(
    boardId: string,
    taskId: string,
    patch: UpdateTaskPatch,
  ): Promise<TaskRow | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of [
      "title",
      "description",
      "priority",
      "assigneeId",
      "estimate",
      "labels",
      "dueDate",
    ] as const) {
      if (patch[k] !== undefined) set[k] = patch[k];
    }
    const [row] = await this.db
      .update(tasks)
      .set(set)
      .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
      .returning();
    return row;
  }

  async archive(boardId: string, taskId: string): Promise<TaskRow | undefined> {
    const now = new Date();
    const [row] = await this.db
      .update(tasks)
      .set({ archivedAt: now, updatedAt: now })
      .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
      .returning();
    return row;
  }

  /**
   * Mueve la tarjeta a otra columna/posición. Transaccional ⚠️: valida WIP de destino,
   * actualiza columnId/position y escribe `task_status_history` en la misma tx (BR-2/BR-3).
   */
  async move(
    boardId: string,
    taskId: string,
    toColumnId: string,
    position: number,
    byUserId: string,
  ): Promise<TaskRow> {
    return withTransaction(this.db, async (tx) => {
      const taskRows = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.boardId, boardId)))
        .limit(1)
        .for("update");
      const task = taskRows[0];
      if (!task) throw new TaskNotFoundError();

      const colRows = await tx
        .select()
        .from(boardColumns)
        .where(and(eq(boardColumns.id, toColumnId), eq(boardColumns.boardId, boardId)))
        .limit(1);
      const targetColumn = colRows[0];
      if (!targetColumn) throw new ColumnNotFoundError();

      const changingColumn = task.columnId !== toColumnId;
      if (changingColumn && targetColumn.wipLimit != null) {
        const [{ c }] = await tx
          .select({ c: count() })
          .from(tasks)
          .where(and(eq(tasks.columnId, toColumnId), isNull(tasks.archivedAt)));
        if (Number(c) >= targetColumn.wipLimit) throw new WipLimitError();
      }

      const [updated] = await tx
        .update(tasks)
        .set({ columnId: toColumnId, position, updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
        .returning();

      if (changingColumn) {
        await tx.insert(taskStatusHistory).values({
          taskId,
          fromColumnId: task.columnId,
          toColumnId,
          byUserId,
        });
      }
      return updated;
    });
  }
}

/** Cuenta tarjetas vivas por columna del board (para WIP/insights). */
export async function countLiveTasksByColumn(
  db: PostgresClient | PostgresTransaction,
  boardId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ columnId: tasks.columnId, c: count() })
    .from(tasks)
    .where(and(eq(tasks.boardId, boardId), isNull(tasks.archivedAt)))
    .groupBy(tasks.columnId);
  return new Map(rows.map((r) => [r.columnId, Number(r.c)]));
}
