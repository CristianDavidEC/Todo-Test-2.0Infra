"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AddMemberSchema,
  ChangeRoleSchema,
  CreateWorkspaceSchema,
  type WorkspaceRole,
} from "@todo-list-poc-infra/types";
import {
  addMember,
  archiveWorkspace,
  changeMemberRole,
  createWorkspace,
  leaveWorkspace,
  removeMember,
  WorkspaceApiError,
} from "./workspaces.api";

/** Estado de un form action (compatible con `useActionState`). */
export interface ActionState {
  error?: string;
}

/** Traduce un fallo a mensaje para el form; re-lanza redirect/errores de control. */
function toMessage(err: unknown): string {
  if (err instanceof WorkspaceApiError) return err.message;
  return "Algo salió mal. Inténtalo de nuevo.";
}

export async function createWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CreateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let id: string;
  try {
    const ws = await createWorkspace(parsed.data);
    id = ws.id;
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath("/workspaces");
  redirect(`/w/${id}`);
}

export async function addMemberAction(
  workspaceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = AddMemberSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  try {
    await addMember(workspaceId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath(`/w/${workspaceId}/members`);
  return {};
}

// Firma `(…ids, prevState, formData)` → compatible con `useActionState` tras `.bind`.
export async function changeRoleAction(
  workspaceId: string,
  userId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ChangeRoleSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return { error: "Rol inválido" };

  try {
    await changeMemberRole(workspaceId, userId, parsed.data.role as WorkspaceRole);
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath(`/w/${workspaceId}/members`);
  return {};
}

export async function removeMemberAction(
  workspaceId: string,
  userId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await removeMember(workspaceId, userId);
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(`/w/${workspaceId}/members`);
  return {};
}

export async function archiveWorkspaceAction(workspaceId: string): Promise<void> {
  await archiveWorkspace(workspaceId);
  revalidatePath("/workspaces");
  redirect("/workspaces");
}

export async function leaveWorkspaceAction(workspaceId: string): Promise<void> {
  await leaveWorkspace(workspaceId);
  revalidatePath("/workspaces");
  redirect("/workspaces");
}
