import "server-only";
import { auth0 } from "@/lib/auth0";
import type { CreateProject, Project, UpdateProject } from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";

/**
 * Cliente HTTP del recurso `projects` (SOLO server). Mismo patrón que `workspaces.api`:
 * adjunta el access token de Auth0 como `Bearer` y pega al `todo-service`. Reusa
 * `WorkspaceApiError` (un único tipo de error web; las rutas ya ramifican por `.status`).
 *
 * El backend es la autoridad de acceso: 404 si no eres miembro del workspace o el
 * proyecto es de otro tenant, 403 si el rol no alcanza, 409 si la clave duplica.
 */

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

export function listProjects(workspaceId: string): Promise<Project[]> {
  return apiFetch(`/workspaces/${workspaceId}/projects`);
}

export function getProject(workspaceId: string, projectId: string): Promise<Project> {
  return apiFetch(`/workspaces/${workspaceId}/projects/${projectId}`);
}

export function createProject(workspaceId: string, input: CreateProject): Promise<Project> {
  return apiFetch(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(
  workspaceId: string,
  projectId: string,
  patch: UpdateProject,
): Promise<Project> {
  return apiFetch(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function archiveProject(workspaceId: string, projectId: string): Promise<Project> {
  return apiFetch(`/workspaces/${workspaceId}/projects/${projectId}`, { method: "DELETE" });
}
