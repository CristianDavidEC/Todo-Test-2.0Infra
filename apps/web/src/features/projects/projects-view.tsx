import Link from "next/link";
import type { Project, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { CreateProjectForm } from "./create-project-form";
import { STATUS_LABELS } from "./status";

/**
 * Vista de `/w/[id]/projects` (server, presentacional). Sin proyectos → estado vacío.
 * El form de creación es solo-Owner (el backend igual refuerza con 403).
 */
export function ProjectsView({
  workspace,
  projects,
}: {
  workspace: WorkspaceWithRole;
  projects: Project[];
}) {
  const isOwner = workspace.role === "owner";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/w/${workspace.id}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted transition-colors hover:text-primary"
      >
        ← Volver a {workspace.name}
      </Link>

      <h1 className="mt-6 text-3xl font-black tracking-tight text-ink">Proyectos</h1>
      <p className="mt-1 text-ink-muted">
        {isOwner ? "Crea y gestiona los proyectos del workspace." : "Proyectos del workspace."}
      </p>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-card bg-surface p-8 text-center shadow-candy-secondary">
          <div className="mb-3 text-4xl">📋</div>
          <p className="text-lg font-bold text-ink">Aún no hay proyectos</p>
          <p className="mt-1 text-sm text-ink-muted">
            {isOwner ? "Crea el primero abajo." : "Un Owner debe crear el primero."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/w/${workspace.id}/projects/${p.id}`}
              className="rounded-card bg-surface p-5 shadow-candy-secondary transition-transform hover:scale-[1.03]"
            >
              <div className="flex items-center gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card font-mono text-sm font-black"
                  style={{ backgroundColor: `${p.color}22`, color: p.color }}
                >
                  {p.key}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-ink">{p.name}</p>
                  <span className="mt-0.5 inline-block rounded-pill bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-primary">
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isOwner && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-black tracking-tight">Nuevo proyecto</h2>
          <CreateProjectForm workspaceId={workspace.id} />
        </section>
      )}
    </main>
  );
}
