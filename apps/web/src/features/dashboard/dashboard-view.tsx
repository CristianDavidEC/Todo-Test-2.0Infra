import type { DashboardModel } from "./dashboard.model";

/**
 * Vista del dashboard (server component, presentacional).
 *
 * Recibe el modelo ya resuelto; NO toca Auth0, env ni hace fetch. La feature
 * posee su propia UI — la ruta (`app/dashboard/page.tsx`) solo la compone.
 */
export function DashboardView({ displayName, subject, isAdmin }: DashboardModel) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {isAdmin && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
              Admin
            </span>
          )}
        </div>
        <p className="text-gray-400">Área protegida — solo usuarios autenticados.</p>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <p className="text-sm text-gray-400">Sesión activa</p>
          <p className="mt-1 font-medium">{displayName}</p>
          <p className="text-xs text-gray-500">{subject}</p>
        </div>
      </div>
    </main>
  );
}

/**
 * Estado cuando Auth0 aún no tiene credenciales reales (`isAuth0Configured` =
 * false). El sitio público sigue vivo; aquí mostramos un placeholder en vez de
 * romper con un 500. Al setear los secrets del tenant, la ruta sirve `DashboardView`.
 */
export function DashboardUnconfigured() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-400">
          Auth0 aún no está configurado. El flujo de login estará disponible cuando
          se seteen los secrets del tenant (ver <code className="text-gray-300">infra/src/webs/web.ts</code>).
        </p>
      </div>
    </main>
  );
}
