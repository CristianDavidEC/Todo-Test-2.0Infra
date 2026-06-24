import { z } from "zod";

/**
 * Schemas del módulo M1 (Workspaces). Source of truth de tipos + validación,
 * compartidos entre la API (todo-service) y el web. Los timestamps viajan como
 * ISO strings (la API serializa los `Date` de la BD), por eso son `z.string().datetime()`.
 */

/** Roles de membership (BR-3). DB-backed, NO claims de Auth0. */
export const WorkspaceRoleSchema = z.enum(["owner", "member"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

/**
 * Preset de colores de branding (BR-9). Fuente ÚNICA compartida por la validación
 * del backend y el color-picker del web — saturados y coherentes con "Candy"
 * (los 3 acentos de marca + 3 complementarios). Branding = color del preset + emoji;
 * sin subida de imágenes.
 */
export const WORKSPACE_COLOR_PRESETS = [
  "#e040a0", // hot pink (primary / marca)
  "#7c52aa", // purple (secondary)
  "#0096cc", // sky blue (tertiary)
  "#00b894", // mint
  "#f59e0b", // amber
  "#e53e3e", // coral
] as const;
export const WorkspaceColorSchema = z.enum(WORKSPACE_COLOR_PRESETS);
export type WorkspaceColor = z.infer<typeof WorkspaceColorSchema>;

/** Ícono de branding: un emoji (BR-9). */
export const WorkspaceIconSchema = z
  .string()
  .emoji("El ícono debe ser un emoji")
  .min(1)
  .max(8);

/** Nombre: no único, 1–80 chars. */
export const WorkspaceNameSchema = z.string().trim().min(1).max(80);

/** Workspace tal como lo devuelve la API (mapea `WorkspaceRow`). */
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: WorkspaceNameSchema,
  // En lectura NO re-validamos color/icon contra el preset (tolerante a datos
  // previos); el preset solo se exige en los inputs de escritura.
  color: z.string(),
  icon: z.string(),
  createdBy: z.string().uuid(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

/** Workspace + el rol del usuario que consulta (listado/detalle). */
export const WorkspaceWithRoleSchema = WorkspaceSchema.extend({
  role: WorkspaceRoleSchema,
});
export type WorkspaceWithRole = z.infer<typeof WorkspaceWithRoleSchema>;

/** Body de creación (BR-1). `createdBy` lo pone el backend desde `req.user`, no el cliente. */
export const CreateWorkspaceSchema = z.object({
  name: WorkspaceNameSchema,
  color: WorkspaceColorSchema,
  icon: WorkspaceIconSchema,
});
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;

/** Body de edición de branding: parcial, con al menos un campo (BR-4, solo Owner). */
export const UpdateWorkspaceBrandingSchema = z
  .object({
    name: WorkspaceNameSchema,
    color: WorkspaceColorSchema,
    icon: WorkspaceIconSchema,
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Debe incluir al menos un campo a actualizar",
  });
export type UpdateWorkspaceBranding = z.infer<typeof UpdateWorkspaceBrandingSchema>;

/** Body de "agregar miembro": email de un usuario YA registrado (BR-6). */
export const AddMemberSchema = z.object({
  email: z.string().trim().email(),
});
export type AddMember = z.infer<typeof AddMemberSchema>;

/** Body de "cambiar rol" (BR-4; BR-5 se valida en la capa de datos). */
export const ChangeRoleSchema = z.object({
  role: WorkspaceRoleSchema,
});
export type ChangeRole = z.infer<typeof ChangeRoleSchema>;

/** Fila de la vista de miembros (membership + datos del usuario; mapea `WorkspaceMemberRow`). */
export const WorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  picture: z.string().url().nullable(),
  role: WorkspaceRoleSchema,
  createdAt: z.string().datetime(), // fecha de alta de la membership
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
