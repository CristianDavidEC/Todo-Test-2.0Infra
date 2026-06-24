import Link from "next/link";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { CreateWorkspaceForm } from "./create-workspace-form";

/**
 * Vista de `/workspaces` (server, presentacional). Sin membresías → onboarding
 * de estado vacío (BR-11). Con membresías → grid de workspaces + form de creación.
 */
export function WorkspacesView({ workspaces }: { workspaces: WorkspaceWithRole[] }) {
  if (workspaces.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10">
        <div className="mb-6 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-pill bg-primary-container px-4 py-1.5 text-sm font-bold text-on-primary-container">
            ✨ ¡Empieza aquí!
          </span>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Crea tu primer workspace</h1>
          <p className="mt-2 text-on-surface-variant">
            Un workspace agrupa a tu equipo, sus proyectos y tableros. Empieza aquí.
          </p>
        </div>
        <CreateWorkspaceForm />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-black tracking-tight text-on-surface">Tus workspaces</h1>
      <p className="mt-1 text-lg text-on-surface-variant">Elige uno para entrar, o crea otro.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            href={`/w/${ws.id}`}
            className="bouncy-hover group overflow-hidden rounded-card border border-outline-variant bg-surface shadow-candy-secondary"
          >
            <div className="h-2 w-full" style={{ backgroundColor: ws.color }} />
            <div className="flex items-center gap-4 p-5">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card text-2xl"
                style={{ backgroundColor: `${ws.color}22` }}
              >
                {ws.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-on-surface">{ws.name}</p>
                <span
                  className="mt-1 inline-block rounded-pill px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: `${ws.color}22`, color: ws.color }}
                >
                  {ws.role === "owner" ? "👑 Owner" : "👤 Miembro"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-black tracking-tight text-on-surface">Nuevo workspace</h2>
        <CreateWorkspaceForm />
      </section>
    </main>
  );
}

/**
 * Fallback cuando Auth0 no tiene credenciales (`isAuth0Configured` = false): sin
 * token no se puede llamar al backend. El sitio público sigue vivo.
 */
export function WorkspacesUnconfigured() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-black tracking-tight text-on-surface">Workspaces</h1>
      <p className="mt-2 text-on-surface-variant">
        Auth0 aún no está configurado. Los workspaces estarán disponibles cuando se
        seteen los secrets del tenant (ver{" "}
        <code className="text-primary">infra/src/webs/web.ts</code>).
      </p>
    </main>
  );
}
