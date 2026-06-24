import "server-only";
import { auth0 } from "@/lib/auth0";
import type {
  AddMember,
  ChangeRole,
  CreateWorkspace,
  UpdateWorkspaceBranding,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceWithRole,
} from "@todo-list-poc-infra/types";

/**
 * Cliente HTTP del recurso `workspaces` (SOLO server). Adjunta el access token de
 * Auth0 como `Bearer` y pega al `todo-service` vía API Gateway. `server-only`
 * garantiza que el token nunca cruce al bundle del cliente.
 *
 * El backend (guard por workspace) es la autoridad real de acceso: 404 si no eres
 * miembro, 403 si el rol no alcanza, 409 en violaciones BR-5 / duplicados.
 */

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api`;

/** Error de la API con el status HTTP, para que actions/páginas mapeen 404/403/409. */
export class WorkspaceApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceApiError";
  }
}

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

  // 204 No Content (remove/leave) → sin body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listWorkspaces(): Promise<WorkspaceWithRole[]> {
  return apiFetch("/workspaces");
}

export function getWorkspace(id: string): Promise<WorkspaceWithRole> {
  return apiFetch(`/workspaces/${id}`);
}

export function createWorkspace(input: CreateWorkspace): Promise<WorkspaceWithRole> {
  return apiFetch("/workspaces", { method: "POST", body: JSON.stringify(input) });
}

export function updateBranding(id: string, patch: UpdateWorkspaceBranding): Promise<Workspace> {
  return apiFetch(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function archiveWorkspace(id: string): Promise<Workspace> {
  return apiFetch(`/workspaces/${id}`, { method: "DELETE" });
}

export function listMembers(id: string): Promise<WorkspaceMember[]> {
  return apiFetch(`/workspaces/${id}/members`);
}

export function addMember(id: string, input: AddMember): Promise<WorkspaceMember> {
  return apiFetch(`/workspaces/${id}/members`, { method: "POST", body: JSON.stringify(input) });
}

export function changeMemberRole(
  id: string,
  userId: string,
  role: WorkspaceRole,
): Promise<{ userId: string; role: WorkspaceRole }> {
  const body: ChangeRole = { role };
  return apiFetch(`/workspaces/${id}/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function removeMember(id: string, userId: string): Promise<void> {
  return apiFetch(`/workspaces/${id}/members/${userId}`, { method: "DELETE" });
}

export function leaveWorkspace(id: string): Promise<void> {
  return apiFetch(`/workspaces/${id}/leave`, { method: "POST" });
}
