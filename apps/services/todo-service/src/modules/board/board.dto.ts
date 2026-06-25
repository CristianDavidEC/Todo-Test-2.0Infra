/**
 * DTOs del recurso `board` — re-export desde `@todo-list-poc-infra/types`.
 */
export {
  CreateColumnSchema,
  UpdateColumnSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
} from "@todo-list-poc-infra/types";
export type {
  Board as BoardDto,
  Column as ColumnDto,
  Task as TaskDto,
  BoardWithColumns as BoardWithColumnsDto,
  BoardInsights as BoardInsightsDto,
  CreateColumn as CreateColumnDto,
  UpdateColumn as UpdateColumnDto,
  CreateTask as CreateTaskDto,
  UpdateTask as UpdateTaskDto,
  MoveTask as MoveTaskDto,
  TaskPriority,
} from "@todo-list-poc-infra/types";
