import { notFound, redirect } from "next/navigation";
import type { Invitation, WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, listMembers, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { listInvitations } from "@/features/invitations/invitations.api";
import { MembersView } from "@/features/workspaces/members-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/w/[id]/members` — THIN. Carga el workspace (para el rol) + sus miembros, y
 * (si owner/admin) las invitaciones pendientes. No-miembro → 404 vía backend.
 */
export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  let workspace: WorkspaceWithRole;
  let members: WorkspaceMember[];
  try {
    [workspace, members] = await Promise.all([getWorkspace(id), listMembers(id)]);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }

  // Invitaciones pendientes solo para gestión (owner/admin); silenciar 403 de viewers/members.
  let invitations: Invitation[] = [];
  if (workspace.role === "owner" || workspace.role === "admin") {
    invitations = await listInvitations(id).catch(() => []);
  }

  return <MembersView workspace={workspace} members={members} invitations={invitations} />;
}
