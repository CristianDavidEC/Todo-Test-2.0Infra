import { redirect } from "next/navigation";
// Subpath dedicado (no el barrel) para no arrastrar el guard NestJS al bundle de Next.
import type { NextAuth0Session } from "@app/auth/nextjs";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { DashboardView, DashboardUnconfigured } from "@/features/dashboard/dashboard-view";
import { toDashboardModel } from "@/features/dashboard/dashboard.model";

/**
 * Ruta /dashboard — THIN (Screaming Architecture).
 *
 * La ruta SOLO orquesta el gate de acceso server-side y compone la feature; la UI
 * y el modelo viven en `features/dashboard/`. Sin lógica de dominio aquí.
 *
 * `auth0.getSession()` lee la sesión server-side (cookie httpOnly). Sin sesión →
 * redirige a `/auth/login`. Dinámica (no se prerenderiza en build).
 *
 * GUARD: sin credenciales Auth0, `getSession()` lanza → 500. Mientras no esté
 * configurado servimos `DashboardUnconfigured` en vez de romper.
 *
 * ALTA EN BD (lazy-sync): el login en Auth0 NO crea la fila en Postgres. El alta
 * ocurre la primera vez que el usuario pega a una ruta protegida del backend
 * (`Auth0Guard` → `UsersRepository.lazyUpsert`). La plantilla NO fuerza el alta al
 * login a propósito (portabilidad + bajo acoplamiento). Para forzarla, llama al
 * backend con el access token desde un server component (`auth0.getAccessToken()`).
 */
export default async function DashboardPage() {
  if (!isAuth0Configured) {
    return <DashboardUnconfigured />;
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const model = toDashboardModel(
    session as unknown as NextAuth0Session,
    process.env.AUTH0_NAMESPACE,
  );
  return <DashboardView {...model} />;
}
