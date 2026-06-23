import Link from "next/link";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { archiveWorkspaceAction, leaveWorkspaceAction } from "./workspaces.actions";

/**
 * Detalle de un workspace (server, presentacional). Muestra branding + accesos.
 * Acciones destructivas (salir / archivar) van como server-action forms; archivar
 * es solo-Owner (BR-8) — el backend igual lo refuerza con 403 si no.
 */
export function WorkspaceDetailView({ workspace }: { workspace: WorkspaceWithRole }) {
  const isOwner = workspace.role === "owner";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/workspaces" className="text-sm font-bold text-ink-muted hover:text-primary">
        ← Workspaces
      </Link>

      <header className="mt-4 flex items-center gap-5">
        <span
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-card text-4xl"
          style={{ backgroundColor: `${workspace.color}22` }}
        >
          {workspace.icon}
        </span>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{workspace.name}</h1>
          <span className="mt-1 inline-block rounded-pill bg-primary-fixed px-3 py-0.5 text-xs font-bold text-primary">
            {isOwner ? "Owner" : "Miembro"}
          </span>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/w/${workspace.id}/members`}
          className="rounded-card bg-surface p-5 shadow-candy-secondary transition-transform hover:scale-[1.03]"
        >
          <p className="text-lg font-bold text-ink">Miembros</p>
          <p className="mt-1 text-sm text-ink-muted">
            {isOwner ? "Gestiona el equipo y sus roles" : "Ver el equipo"}
          </p>
        </Link>

        <div className="rounded-card bg-surface p-5 shadow-candy-tertiary opacity-70">
          <p className="text-lg font-bold text-ink">Proyectos</p>
          <p className="mt-1 text-sm text-ink-muted">Próximamente (M2)</p>
        </div>
      </div>

      <section className="mt-10 flex flex-wrap gap-3">
        <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
          <button
            type="submit"
            className="rounded-pill border border-primary/30 px-5 py-2.5 font-bold text-primary transition-transform hover:scale-[1.03]"
          >
            Salir del workspace
          </button>
        </form>

        {isOwner && (
          <form action={archiveWorkspaceAction.bind(null, workspace.id)}>
            <button
              type="submit"
              className="rounded-pill border border-red-300 px-5 py-2.5 font-bold text-red-600 transition-transform hover:scale-[1.03]"
            >
              Archivar workspace
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
