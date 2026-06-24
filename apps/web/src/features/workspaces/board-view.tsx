import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { WorkspaceNav } from "./workspace-nav";

/**
 * Vista `/w/[id]/board` — recreada de la pantalla Stitch "Tablero Kanban Inteligente".
 * Las columnas y el estilo están listos; las tareas dependen del backend de
 * proyectos/tasks (M2), así que cada columna muestra un estado vacío honesto.
 */
const COLUMNS = [
  { key: "todo", title: "Por hacer", accent: "#7c52aa" },
  { key: "doing", title: "En progreso", accent: "#e040a0" },
  { key: "review", title: "En revisión", accent: "#0096cc" },
  { key: "done", title: "Hecho", accent: "#22a06b" },
] as const;

export function BoardView({ workspace }: { workspace: WorkspaceWithRole }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <WorkspaceNav workspaceId={workspace.id} active="board" />

      <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface">Tablero Kanban</h1>
          <p className="mt-1 text-lg text-on-surface-variant">
            Flujo de trabajo de <span className="font-bold text-primary">{workspace.name}</span>.
          </p>
        </div>
        <span className="rounded-pill bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container">
          🗂️ Tableros llegan en M2
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-card border border-outline-variant bg-surface-container-low p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 font-black text-on-surface">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.accent }} />
                {col.title}
              </span>
              <span className="rounded-pill bg-surface px-2.5 py-0.5 text-xs font-bold text-on-surface-variant">0</span>
            </div>
            <div className="flex h-40 flex-col items-center justify-center rounded-card border-2 border-dashed border-outline-variant text-center">
              <span className="text-3xl opacity-60">🍬</span>
              <p className="mt-2 px-4 text-xs font-bold text-on-surface-variant">Sin tareas todavía</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
