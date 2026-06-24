import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { archiveWorkspaceAction, leaveWorkspaceAction } from "./workspaces.actions";
import { SettingsForm } from "./settings-form";
import { WorkspaceShell } from "./workspace-shell";

/**
 * Vista `/w/[id]/settings` — réplica de "Configuración del Proyecto y
 * Automatizaciones" (Stitch). Identidad (nombre/color/ícono) y Danger Zone van
 * conectados a la API real; Roles, Automatizaciones e Integraciones son UI (M2+).
 */
const ROLES = [
  { name: "Administradores", desc: "Acceso total a la configuración", icon: "shield_person", count: "Owners" },
  { name: "Project Managers", desc: "Editan tareas y roadmaps", icon: "edit_calendar", count: "M2" },
  { name: "Colaboradores", desc: "Ven y completan tareas asignadas", icon: "group", count: "Miembros" },
];

export function SettingsView({ workspace }: { workspace: WorkspaceWithRole }) {
  const isOwner = workspace.role === "owner";

  return (
    <WorkspaceShell workspace={workspace} title="Configuración">
      <div className="space-y-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-on-surface">Configuración del Proyecto</h2>
          <p className="text-lg text-on-surface-variant">Personaliza tu workspace.</p>
        </div>

        {/* AI Suggestion banner */}
        <div className="flex flex-col items-start gap-4 rounded-card border-2 border-tertiary/30 bg-tertiary-container/20 p-6 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-tertiary text-on-tertiary">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-on-surface">Sugerencia de IA: Optimización del flujo</h3>
            <p className="text-sm text-on-surface-variant">
              Activa &quot;Auto-archivar sprints completados&quot; para mantener tu tablero ágil. (Disponible en M2)
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="bouncy rounded-pill bg-tertiary px-4 py-2 text-sm font-bold text-on-tertiary opacity-60" disabled>
              Aplicar
            </button>
            <button type="button" className="bouncy rounded-pill px-4 py-2 text-sm font-bold text-on-surface-variant">
              Más tarde
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Workspace Identity (API real) */}
          {isOwner ? (
            <SettingsForm workspace={workspace} />
          ) : (
            <div className="rounded-card border border-outline-variant bg-surface p-6 card-shadow">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-on-surface">
                <span className="material-symbols-outlined text-primary">palette</span> Identidad del Workspace
              </h3>
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-card text-3xl" style={{ backgroundColor: `${workspace.color}22` }}>
                  {workspace.icon}
                </span>
                <div>
                  <p className="text-xl font-black text-on-surface">{workspace.name}</p>
                  <p className="text-sm text-on-surface-variant">Solo los Owners pueden editar.</p>
                </div>
              </div>
            </div>
          )}

          {/* Team Roles (UI / M2) */}
          <div className="rounded-card border border-outline-variant bg-surface p-6 card-shadow">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-on-surface">
              <span className="material-symbols-outlined text-secondary">groups</span> Roles del equipo
            </h3>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.name} className="flex items-center gap-3 rounded-card bg-surface-container-low p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined">{r.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-on-surface">{r.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{r.desc}</p>
                  </div>
                  <span className="rounded-pill bg-secondary-fixed px-2.5 py-0.5 text-xs font-bold text-on-secondary-fixed-variant">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Automations (UI / M2) */}
        <section className="rounded-card border border-outline-variant bg-surface p-6 card-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-black text-on-surface">
              <span className="material-symbols-outlined text-primary">bolt</span> Automatizaciones inteligentes
            </h3>
            <span className="rounded-pill bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
              Powered by AI · M2
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["AI Sprint Summarizer", "Auto-Focus Mode", "Magic Task Sizing"].map((a) => (
              <div key={a} className="flex items-center justify-between rounded-card bg-surface-container-low p-4">
                <span className="text-sm font-bold text-on-surface">{a}</span>
                <span className="h-6 w-11 rounded-pill bg-outline-variant" aria-hidden />
              </div>
            ))}
          </div>
        </section>

        {/* Integraciones (UI / M2) */}
        <section className="rounded-card border border-outline-variant bg-surface p-6 card-shadow">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-on-surface">
            <span className="material-symbols-outlined text-tertiary">hub</span> Integraciones
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Slack", "GitHub", "Dropbox", "Adobe CC"].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-card bg-surface-container-low p-4 text-center">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant">power</span>
                <span className="text-sm font-bold text-on-surface">{i}</span>
                <span className="text-xs font-bold text-on-surface-variant">Próximamente</span>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone (API real) */}
        <section className="rounded-card border-2 border-error/40 bg-error/5 p-6">
          <h3 className="flex items-center gap-2 text-xl font-black text-error">
            <span className="material-symbols-outlined">warning</span> Zona de peligro
          </h3>

          <div className="mt-4 flex flex-col items-start justify-between gap-4 border-b border-error/20 pb-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-on-surface">Salir del workspace</p>
              <p className="mt-1 text-sm text-on-surface-variant">Dejarás de tener acceso a sus proyectos.</p>
            </div>
            <form action={leaveWorkspaceAction.bind(null, workspace.id)}>
              <button type="submit" className="bouncy rounded-pill border-2 border-error/40 px-6 py-2 font-bold text-error transition-colors hover:bg-error/10">
                Salir del workspace
              </button>
            </form>
          </div>

          {isOwner && (
            <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-on-surface">Archivar workspace</p>
                <p className="mt-1 text-sm text-on-surface-variant">Se ocultará de tu lista (BR-8, refuerza el backend).</p>
              </div>
              <form action={archiveWorkspaceAction.bind(null, workspace.id)}>
                <button type="submit" className="bouncy rounded-pill bg-error px-6 py-2 font-bold text-on-error">
                  Archivar workspace
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
