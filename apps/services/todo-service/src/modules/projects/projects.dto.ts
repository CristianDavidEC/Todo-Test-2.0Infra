/**
 * DTOs del recurso `projects`.
 *
 * Zod es la source of truth (regla del monorepo): schemas y tipos viven en
 * `@todo-list-poc-infra/types` y aquí solo se re-exportan. No se re-derivan ZodObjects
 * localmente (evita doble instancia de zod → tipos incompatibles).
 */
export { CreateProjectSchema, UpdateProjectSchema } from "@todo-list-poc-infra/types";
export type {
  Project as ProjectDto,
  CreateProject as CreateProjectDto,
  UpdateProject as UpdateProjectDto,
  ProjectStatus,
} from "@todo-list-poc-infra/types";
