import { notFound, redirect } from "next/navigation";
import type { Project, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { getProject } from "@/features/projects/projects.api";
import { ProjectDetailView } from "@/features/projects/project-detail-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/w/[id]/projects/[projectId]` — THIN. Carga el workspace (para el rol) + el
 * proyecto. Proyecto inexistente / de otro workspace → 404 vía backend.
 */
export default async function ProjectPage({
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
  try {
    [workspace, project] = await Promise.all([getWorkspace(id), getProject(id, projectId)]);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }
  return <ProjectDetailView workspace={workspace} project={project} />;
}
