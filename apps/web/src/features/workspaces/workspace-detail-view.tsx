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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/workspaces" className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-primary transition-colors">
        ← Volver a workspaces
      </Link>

      <header className="mt-6 rounded-card bg-surface p-8 shadow-candy-primary">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <span
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card text-5xl shadow-lg"
              style={{ backgroundColor: `${workspace.color}22` }}
            >
              {workspace.icon}
            </span>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-ink">{workspace.name}</h1>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-pill px-4 py-1 text-sm font-bold" style={{ backgroundColor: `${workspace.color}22`, color: workspace.color }}>
                  {isOwner ? "👑 Owner" : "👤 Miembro"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/w/${workspace.id}/members`}
          className="group rounded-card bg-surface p-6 shadow-candy-secondary transition-all hover:scale-[1.03] hover:shadow-lg"
        >
          <div className="text-3xl mb-3">👥</div>
          <p className="text-lg font-bold text-ink">Miembros del equipo</p>
          <p className="mt-2 text-sm text-ink-muted">
            {isOwner ? "Gestiona roles y permisos" : "Ver miembros y colaboradores"}
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">
            Abrir →
          </div>
        </Link>

        <div className="rounded-card bg-surface p-6 shadow-candy-tertiary opacity-75 border border-tertiary/20">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-lg font-bold text-ink">Proyectos</p>
          <p className="mt-2 text-sm text-ink-muted">Crea y gestiona tus proyectos</p>
          <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-tertiary bg-tertiary/10 px-3 py-1 rounded-pill">
            Próximamente (M2)
          </div>
        </div>

        <div className="rounded-card bg-surface p-6 shadow-candy-secondary opacity-75 border border-secondary/20">
          <div className="text-3xl mb-3">⚙️</div>
          <p className="text-lg font-bold text-ink">Configuración</p>
          <p className="mt-2 text-sm text-ink-muted">Ajustes y personalización</p>
          <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-pill">
            Próximamente
          </div>
        </div>
      </div>

      {isOwner && (
        <section className="mt-12 rounded-card bg-surface p-6 shadow-candy-secondary border border-secondary/20">
          <h2 className="text-lg font-bold text-ink mb-4">Opciones del workspace</h2>
          <div className="flex flex-wrap gap-3">
            <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="rounded-pill border-2 border-primary px-5 py-2 font-bold text-primary transition-all hover:bg-primary hover:text-white hover:scale-[1.03]"
              >
                Salir del workspace
              </button>
            </form>

            <form action={archiveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="rounded-pill border-2 border-red-300 px-5 py-2 font-bold text-red-600 transition-all hover:bg-red-50 hover:scale-[1.03]"
              >
                Archivar workspace
              </button>
            </form>
          </div>
        </section>
      )}

      {!isOwner && (
        <section className="mt-12 rounded-card bg-surface p-6 shadow-candy-secondary">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-ink">Salir de este workspace</p>
              <p className="mt-1 text-sm text-ink-muted">No podrás acceder a sus proyectos</p>
            </div>
            <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="rounded-pill border-2 border-primary px-5 py-2 font-bold text-primary transition-all hover:bg-primary hover:text-white hover:scale-[1.03]"
              >
                Salir
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
