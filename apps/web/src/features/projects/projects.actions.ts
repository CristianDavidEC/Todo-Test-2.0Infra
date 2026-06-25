"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CreateProjectSchema, UpdateProjectSchema } from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { archiveProject, createProject, updateProject } from "./projects.api";

/** Estado de un form action (compatible con `useActionState`). */
export interface ActionState {
  error?: string;
}

function toMessage(err: unknown): string {
  if (err instanceof WorkspaceApiError) return err.message;
  return "Algo salió mal. Inténtalo de nuevo.";
}

// Firma `(workspaceId, prevState, formData)` → compatible con `useActionState` tras `.bind`.
export async function createProjectAction(
  workspaceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const description = formData.get("description");
  const parsed = CreateProjectSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key"),
    description: description ? description : undefined,
    color: formData.get("color"),
    status: formData.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  let id: string;
  try {
    const project = await createProject(workspaceId, parsed.data);
    id = project.id;
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath(`/w/${workspaceId}/projects`);
  redirect(`/w/${workspaceId}/projects/${id}`);
}

export async function updateProjectAction(
  workspaceId: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw: Record<string, unknown> = {};
  for (const field of ["name", "key", "description", "color", "status"] as const) {
    const v = formData.get(field);
    if (v !== null && v !== "") raw[field] = v;
  }
  const parsed = UpdateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await updateProject(workspaceId, projectId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }

  revalidatePath(`/w/${workspaceId}/projects/${projectId}`);
  return {};
}

export async function archiveProjectAction(
  workspaceId: string,
  projectId: string,
): Promise<void> {
  await archiveProject(workspaceId, projectId);
  revalidatePath(`/w/${workspaceId}/projects`);
  redirect(`/w/${workspaceId}/projects`);
}
