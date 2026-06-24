import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { WorkspaceShell } from "./workspace-shell";

/**
 * Vista `/w/[id]/board` ("Kanban") — réplica del "Tablero Kanban Inteligente"
 * (Stitch): columnas con contador + FAB. Las tareas dependen del backend de
 * proyectos/tasks (M2) → cada columna muestra un estado vacío honesto.
 */
const COLUMNS = [
  { key: "todo", title: "Por hacer", accent: "#7c52aa" },
  { key: "doing", title: "En progreso", accent: "#e040a0" },
  { key: "review", title: "En revisión", accent: "#0096cc" },
  { key: "done", title: "Hecho", accent: "#22a06b" },
] as const;

export function BoardView({ workspace }: { workspace: WorkspaceWithRole }) {
  return (
    <WorkspaceShell workspace={workspace} title="Kanban">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-on-surface">Tablero Kanban</h2>
            <p className="text-lg text-on-surface-variant">
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
              <div className="flex h-44 flex-col items-center justify-center rounded-card border-2 border-dashed border-outline-variant text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-60">add_task</span>
                <p className="mt-2 px-4 text-xs font-bold text-on-surface-variant">Sin tareas todavía</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB (como en Stitch) */}
      <button
        type="button"
        className="bouncy fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_8px_24px_rgba(224,64,160,0.4)]"
        aria-label="Nueva tarea (M2)"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </WorkspaceShell>
  );
}
