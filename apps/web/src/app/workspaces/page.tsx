import { redirect } from "next/navigation";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { listWorkspaces } from "@/features/workspaces/workspaces.api";
import { WorkspacesView, WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";

/**
 * Ruta `/workspaces` — THIN. Gate de acceso + fetch de la lista; la UI vive en
 * `features/workspaces/`. Sin Auth0 configurado no hay token → placeholder.
 */
export default async function WorkspacesPage() {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const workspaces = await listWorkspaces();
  return <WorkspacesView workspaces={workspaces} />;
}
