import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { archiveWorkspaceAction } from "./workspaces.actions";
import { SettingsForm } from "./settings-form";
import { WorkspaceNav } from "./workspace-nav";

/**
 * Vista `/w/[id]/settings` — recreada de la pantalla Stitch "Configuración del
 * Proyecto y Automatizaciones". Identidad (nombre/color/ícono) y Danger Zone van
 * conectados a la API real; Automatizaciones e Integraciones son UI (M2+).
 */
export function SettingsView({ workspace }: { workspace: WorkspaceWithRole }) {
  const isOwner = workspace.role === "owner";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <WorkspaceNav workspaceId={workspace.id} active="settings" />

      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-on-surface">Configuración del Proyecto</h1>
        <p className="mt-1 text-lg text-on-surface-variant">
          Personaliza <span className="font-bold text-primary">{workspace.name}</span> y sus automatizaciones.
        </p>
      </div>

      {isOwner ? (
        <SettingsForm workspace={workspace} />
      ) : (
        <div className="rounded-card border border-outline-variant bg-surface p-6 shadow-candy-secondary">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-card text-3xl" style={{ backgroundColor: `${workspace.color}22` }}>
              {workspace.icon}
            </span>
            <div>
              <p className="text-xl font-black text-on-surface">{workspace.name}</p>
              <p className="text-sm text-on-surface-variant">Solo los Owners pueden editar la configuración.</p>
            </div>
          </div>
        </div>
      )}

      {/* Smart Automations (UI / M2) */}
      <section className="mt-8 rounded-card border border-outline-variant bg-surface p-6 shadow-candy-secondary opacity-90">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-on-surface">Automatizaciones inteligentes</h2>
          <span className="rounded-pill bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
            Powered by AI · Próximamente
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
      <section className="mt-6 rounded-card border border-outline-variant bg-surface p-6 shadow-candy-secondary opacity-90">
        <h2 className="mb-4 text-xl font-black text-on-surface">Integraciones</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["Slack", "GitHub", "Dropbox", "Adobe CC"].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-card bg-surface-container-low p-4 text-center">
              <span className="text-2xl">🔌</span>
              <span className="text-sm font-bold text-on-surface">{i}</span>
              <span className="text-xs font-bold text-on-surface-variant">Próximamente</span>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone (API real) */}
      {isOwner && (
        <section className="mt-6 rounded-card border-2 border-error/40 bg-error/5 p-6">
          <h2 className="text-xl font-black text-error">Zona de peligro</h2>
          <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-on-surface">Archivar workspace</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Se ocultará de tu lista. Esta acción la realiza el backend (BR-8).
              </p>
            </div>
            <form action={archiveWorkspaceAction.bind(null, workspace.id)}>
              <button
                type="submit"
                className="bouncy-hover rounded-pill bg-error px-6 py-2 font-bold text-on-error"
              >
                Archivar workspace
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
