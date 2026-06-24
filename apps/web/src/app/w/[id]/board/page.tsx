import { notFound, redirect } from "next/navigation";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { BoardView } from "@/features/workspaces/board-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/** Ruta `/w/[id]/board` — THIN. No-miembro → 404 vía backend. */
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
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
  return <BoardView workspace={workspace} />;
}
