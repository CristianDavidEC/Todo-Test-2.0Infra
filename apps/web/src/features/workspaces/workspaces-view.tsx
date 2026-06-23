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
          <h1 className="text-3xl font-black tracking-tight">Crea tu primer workspace</h1>
          <p className="mt-2 text-ink-muted">
            Un workspace agrupa a tu equipo, sus proyectos y tableros. Empieza aquí.
          </p>
        </div>
        <CreateWorkspaceForm />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">Tus workspaces</h1>
      <p className="mt-1 text-ink-muted">Elige uno para entrar, o crea otro.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            href={`/w/${ws.id}`}
            className="rounded-card bg-surface p-5 shadow-candy-secondary transition-transform hover:scale-[1.03]"
          >
            <div className="flex items-center gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card text-2xl"
                style={{ backgroundColor: `${ws.color}22` }}
              >
                {ws.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-ink">{ws.name}</p>
                <span className="mt-0.5 inline-block rounded-pill bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-primary">
                  {ws.role === "owner" ? "Owner" : "Miembro"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-black tracking-tight">Nuevo workspace</h2>
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
      <h1 className="text-2xl font-black tracking-tight">Workspaces</h1>
      <p className="mt-2 text-ink-muted">
        Auth0 aún no está configurado. Los workspaces estarán disponibles cuando se
        seteen los secrets del tenant (ver{" "}
        <code className="text-primary">infra/src/webs/web.ts</code>).
      </p>
    </main>
  );
}
