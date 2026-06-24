import { notFound, redirect } from "next/navigation";
import type { WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, listMembers, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { MetricsView } from "@/features/workspaces/metrics-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/** Ruta `/w/[id]/metrics` — THIN. Carga workspace + miembros para stats reales. */
export default async function MetricsPage({ params }: { params: Promise<{ id: string }> }) {
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
  return <MetricsView workspace={workspace} members={members} />;
}
