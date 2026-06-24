import type { WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { WorkspaceShell } from "./workspace-shell";

/**
 * Vista `/w/[id]/metrics` — réplica de "Métricas y Analíticas" (Stitch). Las stats
 * de equipo se derivan de datos reales (miembros/roles). Burndown, velocity y
 * pronósticos de IA dependen de tasks/sprints (M2) → estado vacío honesto.
 */
export function MetricsView({
  workspace,
  members,
}: {
  workspace: WorkspaceWithRole;
  members: WorkspaceMember[];
}) {
  const owners = members.filter((m) => m.role === "owner").length;
  const regular = members.length - owners;
  const ownerPct = members.length ? Math.round((owners / members.length) * 100) : 0;

  const kpis = [
    { value: members.length, label: "Miembros activos", color: "text-primary" },
    { value: owners, label: "Owners", color: "text-secondary" },
    { value: regular, label: "Colaboradores", color: "text-tertiary" },
    { value: `${ownerPct}%`, label: "Ratio de Owners", color: "text-on-surface" },
  ];

  return (
    <WorkspaceShell workspace={workspace} title="Métricas">
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-on-surface">Dashboard de Analítica</h2>
            <p className="text-lg text-on-surface-variant">
              Insights de <span className="font-bold text-primary">{workspace.name}</span>.
            </p>
          </div>
          <span className="rounded-pill bg-tertiary-container px-4 py-2 text-sm font-bold text-on-tertiary-container">
            📈 En vivo · equipo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="bouncy rounded-card border border-outline-variant bg-surface p-6 text-center card-shadow">
              <p className={`text-4xl font-black ${k.color}`}>{k.value}</p>
              <p className="mt-1 text-sm font-bold text-on-surface-variant">{k.label}</p>
            </div>
          ))}
        </div>

        <section className="rounded-card border border-outline-variant bg-surface p-8 card-shadow">
          <h3 className="mb-4 text-xl font-black text-on-surface">Distribución de roles</h3>
          <div className="flex h-5 w-full overflow-hidden rounded-pill bg-surface-variant">
            <div className="h-full bg-primary" style={{ width: `${ownerPct}%` }} />
            <div className="h-full bg-secondary" style={{ width: `${100 - ownerPct}%` }} />
          </div>
          <div className="mt-3 flex gap-6 text-sm font-bold">
            <span className="flex items-center gap-2 text-on-surface-variant">
              <span className="h-3 w-3 rounded-full bg-primary" /> Owners ({owners})
            </span>
            <span className="flex items-center gap-2 text-on-surface-variant">
              <span className="h-3 w-3 rounded-full bg-secondary" /> Colaboradores ({regular})
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            { title: "Burndown del sprint", desc: "Progreso del sprint en tiempo real", icon: "trending_down" },
            { title: "Velocidad del equipo", desc: "Tendencia de puntos completados", icon: "rocket_launch" },
          ].map((c) => (
            <div key={c.title} className="rounded-card border border-outline-variant bg-surface p-8 blue-shadow">
              <h3 className="text-lg font-black text-on-surface">{c.title}</h3>
              <p className="text-sm text-on-surface-variant">{c.desc}</p>
              <div className="mt-6 flex h-40 flex-col items-center justify-center rounded-card bg-surface-container-low text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">{c.icon}</span>
                <p className="mt-2 text-sm font-bold text-on-surface-variant">Disponible con tableros y sprints (M2)</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </WorkspaceShell>
  );
}
