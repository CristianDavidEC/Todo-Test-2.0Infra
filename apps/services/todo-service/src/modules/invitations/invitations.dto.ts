/**
 * DTOs del recurso `invitations` — re-export desde `@todo-list-poc-infra/types`
 * (Zod source of truth; no se re-derivan ZodObjects localmente).
 */
export { CreateInvitationSchema } from "@todo-list-poc-infra/types";
export type {
  Invitation as InvitationDto,
  InvitationWithToken as InvitationWithTokenDto,
  InvitationPreview as InvitationPreviewDto,
  CreateInvitation as CreateInvitationDto,
  InvitationRole,
} from "@todo-list-poc-infra/types";
