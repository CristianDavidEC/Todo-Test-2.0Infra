import { notFound, redirect } from "next/navigation";
import type { Project, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getWorkspace, WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { listProjects } from "@/features/projects/projects.api";
import { ProjectsView } from "@/features/projects/projects-view";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/w/[id]/projects` — THIN. Carga el workspace (para el rol) + sus proyectos.
 * No-miembro → 404 vía backend.
 */
export default async function ProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  let workspace: WorkspaceWithRole;
  let projects: Project[];
  try {
    [workspace, projects] = await Promise.all([getWorkspace(id), listProjects(id)]);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }
  return <ProjectsView workspace={workspace} projects={projects} />;
}
