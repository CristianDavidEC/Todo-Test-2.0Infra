import Link from "next/link";
import type { Project, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { archiveProjectAction } from "./projects.actions";
import { STATUS_LABELS } from "./status";

/**
 * Detalle de un proyecto (server, presentacional). Archivar es solo-Owner (el backend
 * lo refuerza con 403). La edición full (form) se deja para una iteración posterior;
 * aquí mostramos el branding + estado + acción de archivar.
 */
export function ProjectDetailView({
  workspace,
  project,
}: {
  workspace: WorkspaceWithRole;
  project: Project;
}) {
  const isOwner = workspace.role === "owner";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/w/${workspace.id}/projects`}
        className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted transition-colors hover:text-primary"
      >
        ← Volver a proyectos
      </Link>

      <header className="mt-6 rounded-card bg-surface p-8 shadow-candy-primary">
        <div className="flex items-center gap-5">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-card font-mono text-xl font-black shadow-lg"
            style={{ backgroundColor: `${project.color}22`, color: project.color }}
          >
            {project.key}
          </span>
          <div className="min-w-0">
            <h1 className="text-4xl font-black tracking-tight text-ink">{project.name}</h1>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="rounded-pill px-4 py-1 text-sm font-bold"
                style={{ backgroundColor: `${project.color}22`, color: project.color }}
              >
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>
          </div>
        </div>
        {project.description && (
          <p className="mt-6 text-ink-muted">{project.description}</p>
        )}
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          href={`/w/${workspace.id}/projects/${project.id}/board`}
          className="group rounded-card bg-surface p-6 shadow-candy-tertiary transition-all hover:scale-[1.03] hover:shadow-lg"
        >
          <div className="mb-3 text-3xl">🗂️</div>
          <p className="text-lg font-bold text-ink">Tablero</p>
          <p className="mt-2 text-sm text-ink-muted">Columnas, tarjetas y AI Sidekick</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-tertiary group-hover:translate-x-1 transition-transform">
            Abrir →
          </div>
        </Link>
        <div className="rounded-card bg-surface p-6 opacity-75 shadow-candy-secondary">
          <div className="mb-3 text-3xl">🏃</div>
          <p className="text-lg font-bold text-ink">Sprints</p>
          <p className="mt-2 text-sm text-ink-muted">Planificación y backlog</p>
          <div className="mt-4 inline-flex items-center gap-1 rounded-pill bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
            Próximamente (M6)
          </div>
        </div>
      </div>

      {isOwner && (
        <section className="mt-12 rounded-card bg-surface p-6 shadow-candy-secondary">
          <h2 className="mb-4 text-lg font-bold text-ink">Opciones del proyecto</h2>
          <form action={archiveProjectAction.bind(null, workspace.id, project.id)}>
            <button
              type="submit"
              className="rounded-pill border-2 border-red-300 px-5 py-2 font-bold text-red-600 transition-all hover:scale-[1.03] hover:bg-red-50"
            >
              Archivar proyecto
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
