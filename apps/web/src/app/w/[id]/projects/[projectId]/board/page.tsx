import { notFound, redirect } from "next/navigation";
import type {
  BoardInsights,
  BoardWithColumns,
  Project,
  WorkspaceWithRole,
} from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { getProject } from "@/features/projects/projects.api";
import { getBoard, getInsights } from "@/features/board/board.api";
import { BoardView } from "@/features/board/board-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/w/[id]/projects/[projectId]/board` — THIN. Carga workspace (rol) + proyecto +
 * tablero (auto-creado) + insights. No-miembro / cross-tenant → 404 vía backend.
 */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const { id, projectId } = await params;
  let workspace: WorkspaceWithRole;
  let project: Project;
  let board: BoardWithColumns;
  let insights: BoardInsights;
  try {
    [workspace, project, board, insights] = await Promise.all([
      getWorkspace(id),
      getProject(id, projectId),
      getBoard(id, projectId),
      getInsights(id, projectId),
    ]);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }

  return <BoardView workspace={workspace} project={project} board={board} insights={insights} />;
}
