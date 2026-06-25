import { z } from "zod";

/**
 * Schemas del módulo M4 (Tablero Kanban). Source of truth de tipos + validación.
 * Timestamps como ISO strings.
 */

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const BoardSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Board = z.infer<typeof BoardSchema>;

export const ColumnSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string(),
  position: z.number().int(),
  wipLimit: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Column = z.infer<typeof ColumnSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.string(),
  assigneeId: z.string().uuid().nullable(),
  estimate: z.number().int().nullable(),
  position: z.number().int(),
  labels: z.array(z.string()),
  dueDate: z.string().datetime().nullable(),
  sprintId: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof TaskSchema>;

/** Tablero completo: board + columnas (ordenadas) + tareas vivas (planas). */
export const BoardWithColumnsSchema = z.object({
  board: BoardSchema,
  columns: z.array(ColumnSchema),
  tasks: z.array(TaskSchema),
});
export type BoardWithColumns = z.infer<typeof BoardWithColumnsSchema>;

// ---- Inputs ----
export const TaskTitleSchema = z.string().trim().min(1).max(200);
export const ColumnNameSchema = z.string().trim().min(1).max(60);

export const CreateColumnSchema = z.object({
  name: ColumnNameSchema,
  wipLimit: z.number().int().positive().nullable().optional(),
});
export type CreateColumn = z.infer<typeof CreateColumnSchema>;

export const UpdateColumnSchema = z
  .object({
    name: ColumnNameSchema,
    wipLimit: z.number().int().positive().nullable(),
    position: z.number().int().min(0),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Debe incluir al menos un campo a actualizar",
  });
export type UpdateColumn = z.infer<typeof UpdateColumnSchema>;

export const CreateTaskSchema = z.object({
  columnId: z.string().uuid(),
  title: TaskTitleSchema,
  description: z.string().trim().max(2000).optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  estimate: z.number().int().min(0).max(1000).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    title: TaskTitleSchema,
    description: z.string().trim().max(2000).nullable(),
    priority: TaskPrioritySchema,
    assigneeId: z.string().uuid().nullable(),
    estimate: z.number().int().min(0).max(1000).nullable(),
    labels: z.array(z.string().trim().min(1).max(40)).max(20),
    dueDate: z.string().datetime().nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Debe incluir al menos un campo a actualizar",
  });
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

export const MoveTaskSchema = z.object({
  toColumnId: z.string().uuid(),
  position: z.number().int().min(0),
});
export type MoveTask = z.infer<typeof MoveTaskSchema>;

/** Hallazgo del Sidekick (IA heurística por ahora; LLM = runbook). */
export const BoardInsightSchema = z.object({
  kind: z.enum(["wip_exceeded", "unassigned", "no_estimate", "empty_board", "ok"]),
  severity: z.enum(["info", "warning"]),
  message: z.string(),
});
export type BoardInsight = z.infer<typeof BoardInsightSchema>;

export const BoardInsightsSchema = z.object({
  generatedBy: z.enum(["heuristic", "llm"]),
  insights: z.array(BoardInsightSchema),
});
export type BoardInsights = z.infer<typeof BoardInsightsSchema>;
