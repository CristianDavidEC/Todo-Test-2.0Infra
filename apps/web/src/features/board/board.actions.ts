"use server";

import { revalidatePath } from "next/cache";
import {
  CreateColumnSchema,
  CreateTaskSchema,
  MoveTaskSchema,
} from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import {
  archiveTask,
  createColumn,
  createTask,
  deleteColumn,
  moveTask,
} from "./board.api";

export interface ActionState {
  error?: string;
}

function toMessage(err: unknown): string {
  if (err instanceof WorkspaceApiError) return err.message;
  return "Algo salió mal. Inténtalo de nuevo.";
}

const boardPath = (ws: string, p: string) => `/w/${ws}/projects/${p}/board`;

export async function createColumnAction(
  ws: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const wipRaw = formData.get("wipLimit");
  const parsed = CreateColumnSchema.safeParse({
    name: formData.get("name"),
    wipLimit: wipRaw ? Number(wipRaw) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await createColumn(ws, projectId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(boardPath(ws, projectId));
  return {};
}

export async function createTaskAction(
  ws: string,
  projectId: string,
  columnId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const estimateRaw = formData.get("estimate");
  const parsed = CreateTaskSchema.safeParse({
    columnId,
    title: formData.get("title"),
    priority: formData.get("priority") ?? undefined,
    estimate: estimateRaw ? Number(estimateRaw) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await createTask(ws, projectId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(boardPath(ws, projectId));
  return {};
}

export async function moveTaskAction(
  ws: string,
  projectId: string,
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = MoveTaskSchema.safeParse({
    toColumnId: formData.get("toColumnId"),
    position: 0,
  });
  if (!parsed.success) return { error: "Movimiento inválido" };
  try {
    await moveTask(ws, projectId, taskId, parsed.data);
  } catch (err) {
    return { error: toMessage(err) };
  }
  revalidatePath(boardPath(ws, projectId));
  return {};
}

export async function archiveTaskAction(
  ws: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await archiveTask(ws, projectId, taskId);
  revalidatePath(boardPath(ws, projectId));
}

export async function deleteColumnAction(
  ws: string,
  projectId: string,
  columnId: string,
): Promise<void> {
  await deleteColumn(ws, projectId, columnId);
  revalidatePath(boardPath(ws, projectId));
}
