import Link from "next/link";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { archiveWorkspaceAction, leaveWorkspaceAction } from "./workspaces.actions";
import { WorkspaceNav } from "./workspace-nav";

const ACCESS_CARDS = [
  { icon: "👥", title: "Equipo", desc: "Miembros, roles y permisos", seg: "members", shadow: "shadow-candy-secondary" },
  { icon: "🗂️", title: "Kanban", desc: "Tablero de tareas del equipo", seg: "board", shadow: "shadow-candy-primary" },
  { icon: "📊", title: "Métricas", desc: "Analítica y salud del equipo", seg: "metrics", shadow: "shadow-candy-tertiary" },
  { icon: "⚡", title: "Sprints", desc: "Planificación ágil del trabajo", seg: "sprints", shadow: "shadow-candy-primary" },
  { icon: "⚙️", title: "Configuración", desc: "Branding y automatizaciones", seg: "settings", shadow: "shadow-candy-secondary" },
] as const;

/**
 * Detalle de un workspace (server, presentacional). Muestra branding + accesos.
 * Acciones destructivas (salir / archivar) van como server-action forms; archivar
 * es solo-Owner (BR-8) — el backend igual lo refuerza con 403 si no.
 */
export function WorkspaceDetailView({ workspace }: { workspace: WorkspaceWithRole }) {
  const isOwner = workspace.role === "owner";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/workspaces"
        className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
      >
        ← Volver a workspaces
      </Link>

      <header className="mb-8 mt-6 overflow-hidden rounded-card border border-outline-variant bg-surface shadow-candy-primary">
        <div className="h-3 w-full" style={{ backgroundColor: workspace.color }} />
        <div className="flex items-center gap-5 p-8">
          <span
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card text-5xl shadow-lg"
            style={{ backgroundColor: `${workspace.color}22` }}
          >
            {workspace.icon}
          </span>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-on-surface">{workspace.name}</h1>
            <span
              className="mt-3 inline-block rounded-pill px-4 py-1 text-sm font-bold"
              style={{ backgroundColor: `${workspace.color}22`, color: workspace.color }}
            >
              {isOwner ? "👑 Owner" : "👤 Miembro"}
            </span>
          </div>
        </div>
      </header>

      <WorkspaceNav workspaceId={workspace.id} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESS_CARDS.map((c) => (
          <Link
            key={c.seg}
            href={`/w/${workspace.id}/${c.seg}`}
            className={`bouncy-hover group rounded-card border border-outline-variant bg-surface p-6 ${c.shadow}`}
          >
            <div className="mb-3 text-3xl">{c.icon}</div>
            <p className="text-lg font-bold text-on-surface">{c.title}</p>
            <p className="mt-2 text-sm text-on-surface-variant">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary transition-transform group-hover:translate-x-1">
              Abrir →
            </div>
          </Link>
        ))}
      </div>

      {isOwner ? (
        <section className="mt-12 rounded-card border border-outline-variant bg-surface p-6 shadow-candy-secondary">
          <h2 className="mb-4 text-lg font-bold text-on-surface">Opciones del workspace</h2>
          <div className="flex flex-wrap gap-3">
            <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="bouncy-hover rounded-pill border-2 border-primary px-5 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
              >
                Salir del workspace
              </button>
            </form>
            <form action={archiveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="bouncy-hover rounded-pill border-2 border-error/40 px-5 py-2 font-bold text-error transition-colors hover:bg-error/10"
              >
                Archivar workspace
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className="mt-12 flex items-center justify-between gap-4 rounded-card border border-outline-variant bg-surface p-6 shadow-candy-secondary">
          <div>
            <p className="font-bold text-on-surface">Salir de este workspace</p>
            <p className="mt-1 text-sm text-on-surface-variant">No podrás acceder a sus proyectos</p>
          </div>
          <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
            <button
              type="submit"
              className="bouncy-hover rounded-pill border-2 border-primary px-5 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              Salir
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
