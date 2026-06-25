import { z } from "zod";

/**
 * Schemas del módulo M3 (Invitaciones). Source of truth de tipos + validación.
 * Los timestamps viajan como ISO strings (`z.string().datetime()`).
 */

/** Roles que se pueden conceder por invitación (owner NUNCA por invitación, BR-2). */
export const InvitationRoleSchema = z.enum(["admin", "member", "viewer"]);
export type InvitationRole = z.infer<typeof InvitationRoleSchema>;

export const InvitationStatusSchema = z.enum(["pending", "accepted", "revoked"]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

/** Invitación tal como la lista la gestión (el token NO se expone aquí). */
export const InvitationSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: InvitationRoleSchema,
  status: InvitationStatusSchema,
  invitedBy: z.string().uuid(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

/** Respuesta del POST: la invitación + el token (solo aquí, para el link/dev). */
export const InvitationWithTokenSchema = InvitationSchema.extend({
  token: z.string(),
});
export type InvitationWithToken = z.infer<typeof InvitationWithTokenSchema>;

/** Body de creación (owner/admin). */
export const CreateInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: InvitationRoleSchema,
});
export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;

/** Preview público (para la pantalla de aceptar): solo lo necesario, sin filtrar datos. */
export const InvitationPreviewSchema = z.object({
  workspaceName: z.string(),
  workspaceColor: z.string(),
  workspaceIcon: z.string(),
  role: InvitationRoleSchema,
  email: z.string().email(),
  status: InvitationStatusSchema,
  expired: z.boolean(),
});
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>;
