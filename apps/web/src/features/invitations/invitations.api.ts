import "server-only";
import { auth0 } from "@/lib/auth0";
import type {
  CreateInvitation,
  Invitation,
  InvitationPreview,
  InvitationWithToken,
} from "@todo-list-poc-infra/types";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";

/**
 * Cliente HTTP del recurso `invitations` (SOLO server). Reusa `WorkspaceApiError`.
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

export function listInvitations(workspaceId: string): Promise<Invitation[]> {
  return apiFetch(`/workspaces/${workspaceId}/invitations`);
}

export function createInvitation(
  workspaceId: string,
  input: CreateInvitation,
): Promise<InvitationWithToken> {
  return apiFetch(`/workspaces/${workspaceId}/invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  return apiFetch(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export function getInvitationPreview(token: string): Promise<InvitationPreview> {
  return apiFetch(`/invitations/${token}`);
}

export function acceptInvitation(token: string): Promise<{ workspaceId: string; role: string }> {
  return apiFetch(`/invitations/${token}/accept`, { method: "POST" });
}

export function declineInvitation(token: string): Promise<void> {
  return apiFetch(`/invitations/${token}/decline`, { method: "POST" });
}
