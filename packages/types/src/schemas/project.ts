import { z } from "zod";
import { WORKSPACE_COLOR_PRESETS } from "./workspace";

/**
 * Schemas del módulo M2 (Proyectos). Source of truth de tipos + validación,
 * compartidos entre la API (todo-service) y el web. Los timestamps viajan como
 * ISO strings (la API serializa los `Date` de la BD), por eso son `z.string().datetime()`.
 */

/** Estado de flujo del proyecto (BR-7). ORTOGONAL a `archivedAt`: 'archived' NO es status. */
export const ProjectStatusSchema = z.enum(["active", "paused", "completed"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/**
 * Clave del proyecto (BR-3): 2–10 [A-Z0-9], MAYÚSCULAS estrictas (sin transform), de
 * modo que la clave guardada == input == display. Lista para la numeración de tareas
 * de M4 (p.ej. PROJ-123). La unicidad por workspace (entre vivos) la garantiza la BD.
 */
export const ProjectKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{2,10}$/, "La clave debe ser 2–10 caracteres en MAYÚSCULAS o dígitos");
export type ProjectKey = z.infer<typeof ProjectKeySchema>;

/** Nombre: 1–80 chars (BR-9). */
export const ProjectNameSchema = z.string().trim().min(1).max(80);

/** Color de marca: reusa el preset Candy compartido con workspaces (BR-9). */
export const ProjectColorSchema = z.enum(WORKSPACE_COLOR_PRESETS);

/** Descripción opcional (≤500 chars). */
export const ProjectDescriptionSchema = z.string().trim().max(500);

/** Proyecto tal como lo devuelve la API (mapea `ProjectRow`). */
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: ProjectNameSchema,
  key: z.string(),
  description: z.string().nullable(),
  // En lectura NO re-validamos color/status (tolerante a datos previos);
  // el preset/enum solo se exige en los inputs de escritura.
  status: z.string(),
  color: z.string(),
  createdBy: z.string().uuid(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

/** Body de creación (BR-1/BR-2). `workspaceId` y `createdBy` los pone el backend. */
export const CreateProjectSchema = z.object({
  name: ProjectNameSchema,
  key: ProjectKeySchema,
  description: ProjectDescriptionSchema.optional(),
  color: ProjectColorSchema,
  status: ProjectStatusSchema.optional(), // default 'active' en repo/BD
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;

/** Body de edición: parcial, con al menos un campo (solo Owner). `description` nullable para limpiar. */
export const UpdateProjectSchema = z
  .object({
    name: ProjectNameSchema,
    key: ProjectKeySchema,
    description: ProjectDescriptionSchema.nullable(),
    color: ProjectColorSchema,
    status: ProjectStatusSchema,
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Debe incluir al menos un campo a actualizar",
  });
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
