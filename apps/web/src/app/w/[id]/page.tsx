import { notFound, redirect } from "next/navigation";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { WorkspaceDetailView } from "@/features/workspaces/workspace-detail-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/w/[id]` — THIN. El backend es la autoridad de acceso: si no eres miembro
 * responde 404 → `notFound()` (no se filtra existencia).
 */
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  let workspace: WorkspaceWithRole;
  try {
    workspace = await getWorkspace(id);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }
  return <WorkspaceDetailView workspace={workspace} />;
}
