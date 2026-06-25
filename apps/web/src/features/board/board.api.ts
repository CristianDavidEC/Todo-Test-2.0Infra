import "server-only";
import { auth0 } from "@/lib/auth0";
import type {
  BoardInsights,
  BoardWithColumns,
  Column,
  CreateColumn,
  CreateTask,
  MoveTask,
  Task,
  UpdateColumn,
  UpdateTask,
} from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";

/** Cliente HTTP del recurso `board` (SOLO server). Reusa `WorkspaceApiError`. */
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = await auth0.getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new WorkspaceApiError(res.status, body?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const base = (ws: string, p: string) => `/workspaces/${ws}/projects/${p}/board`;

export function getBoard(ws: string, p: string): Promise<BoardWithColumns> {
  return apiFetch(base(ws, p));
}
export function getInsights(ws: string, p: string): Promise<BoardInsights> {
  return apiFetch(`${base(ws, p)}/insights`);
}
export function createColumn(ws: string, p: string, input: CreateColumn): Promise<Column> {
  return apiFetch(`${base(ws, p)}/columns`, { method: "POST", body: JSON.stringify(input) });
}
export function updateColumn(
  ws: string,
  p: string,
  columnId: string,
  patch: UpdateColumn,
): Promise<Column> {
  return apiFetch(`${base(ws, p)}/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export function deleteColumn(ws: string, p: string, columnId: string): Promise<void> {
  return apiFetch(`${base(ws, p)}/columns/${columnId}`, { method: "DELETE" });
}
export function createTask(ws: string, p: string, input: CreateTask): Promise<Task> {
  return apiFetch(`${base(ws, p)}/tasks`, { method: "POST", body: JSON.stringify(input) });
}
export function updateTask(
  ws: string,
  p: string,
  taskId: string,
  patch: UpdateTask,
): Promise<Task> {
  return apiFetch(`${base(ws, p)}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
export function moveTask(ws: string, p: string, taskId: string, input: MoveTask): Promise<Task> {
  return apiFetch(`${base(ws, p)}/tasks/${taskId}/move`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function archiveTask(ws: string, p: string, taskId: string): Promise<void> {
  return apiFetch(`${base(ws, p)}/tasks/${taskId}`, { method: "DELETE" });
}
