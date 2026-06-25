"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreateInvitationSchema } from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import {
  acceptInvitation,
  createInvitation,
  declineInvitation,
  revokeInvitation,
} from "./invitations.api";

export interface ActionState {
  error?: string;
}

function toMessage(err: unknown): string {
  if (err instanceof WorkspaceApiError) return err.message;
  return "Algo salió mal. Inténtalo de nuevo.";
}

export async function createInvitationAction(
  workspaceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateInvitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    await createInvitation(workspaceId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/w/${workspaceId}/members`);
  return {};
}

export async function revokeInvitationAction(
  workspaceId: string,
  invitationId: string,
): Promise<void> {
  await revokeInvitation(workspaceId, invitationId);
  revalidatePath(`/w/${workspaceId}/members`);
}

export async function acceptInvitationAction(token: string): Promise<void> {
  let workspaceId: string;
  try {
    const res = await acceptInvitation(token);
    workspaceId = res.workspaceId;
  } catch (err) {
    // Re-lanza para que la página /invite muestre el error (status-aware).
    throw err;
  }
  revalidatePath("/workspaces");
  redirect(`/w/${workspaceId}`);
}

export async function declineInvitationAction(token: string): Promise<void> {
  await declineInvitation(token);
  redirect("/workspaces");
}
