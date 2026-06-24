import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { WorkspaceShell } from "./workspace-shell";

/**
 * Vista `/w/[id]/sprints` — réplica de "Planificación de Sprints Inteligente"
 * (Stitch). Estructura (sprint activo + backlog + IA) lista; los datos dependen
 * del backend de sprints/tasks (M2) → estado vacío honesto.
 */
export function SprintsView({ workspace }: { workspace: WorkspaceWithRole }) {
  const stats = [
    { label: "Progreso", value: "—" },
    { label: "Tareas", value: "0" },
    { label: "Puntos", value: "0" },
    { label: "Bloqueadas", value: "0" },
  ];

  return (
    <WorkspaceShell workspace={workspace} title="Sprints">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-on-surface">Planificación de Sprints</h2>
            <p className="text-lg text-on-surface-variant">
              Organiza el trabajo de <span className="font-bold text-primary">{workspace.name}</span>.
            </p>
          </div>
          <span className="rounded-pill bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container">
            ⚡ Sprints llegan en M2
          </span>
        </div>

        <section className="rounded-card border border-outline-variant bg-surface p-8 card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-secondary">Sprint activo</p>
              <h3 className="text-2xl font-black text-on-surface">Aún no hay un sprint activo</h3>
            </div>
            <span className="material-symbols-outlined text-4xl text-primary">flag</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-card bg-surface-container-low p-4 text-center">
                <p className="text-2xl font-black text-on-surface">{s.value}</p>
                <p className="text-xs font-bold text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border-2 border-dashed border-outline-variant bg-surface p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">calendar_month</span>
          <h3 className="mt-3 text-xl font-black text-on-surface">El backlog y los sprints llegan en M2</h3>
          <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
            Cuando exista el backend de proyectos y tareas, aquí planificarás sprints, arrastrarás tareas del backlog y verás insights de IA.
          </p>
        </section>
      </div>
    </WorkspaceShell>
  );
}
