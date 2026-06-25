import { notFound, redirect } from "next/navigation";
import type { InvitationPreview } from "@todo-list-poc-infra/types";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import { getInvitationPreview } from "@/features/invitations/invitations.api";
import { WorkspaceApiError } from "@/features/workspaces/workspaces.api";
import { WorkspacesUnconfigured } from "@/features/workspaces/workspaces-view";
import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/features/invitations/invitations.actions";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Miembro",
  viewer: "Viewer",
};

/**
 * Ruta `/invite/[token]` — THIN. Preview de la invitación + aceptar/rechazar.
 * Requiere login (el backend valida que el email coincida al aceptar).
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  if (!isAuth0Configured) return <WorkspacesUnconfigured />;

  const { token } = await params;

  const session = await auth0.getSession();
  if (!session) redirect(`/auth/login?returnTo=/invite/${token}`);

  let preview: InvitationPreview;
  try {
    preview = await getInvitationPreview(token);
  } catch (err) {
    if (err instanceof WorkspaceApiError && err.status === 404) notFound();
    throw err;
  }

  const unavailable = preview.status !== "pending" || preview.expired;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-card bg-surface p-8 text-center shadow-candy-primary">
        <span
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-card text-4xl shadow-lg"
          style={{ backgroundColor: `${preview.workspaceColor}22` }}
        >
          {preview.workspaceIcon}
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-ink">
          Te invitaron a {preview.workspaceName}
        </h1>
        <p className="mt-2 text-ink-muted">
          Rol:{" "}
          <span className="font-bold text-primary">
            {ROLE_LABELS[preview.role] ?? preview.role}
          </span>
        </p>

        {unavailable ? (
          <p className="mt-6 rounded-card bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {preview.expired
              ? "Esta invitación expiró."
              : "Esta invitación ya no está disponible."}
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <form action={acceptInvitationAction.bind(null, token)}>
              <button
                type="submit"
                className="w-full rounded-pill bg-primary px-5 py-3 font-bold text-white shadow-candy-primary transition-transform hover:scale-[1.02]"
              >
                Aceptar invitación
              </button>
            </form>
            <form action={declineInvitationAction.bind(null, token)}>
              <button
                type="submit"
                className="w-full rounded-pill border-2 border-ink-muted/30 px-5 py-3 font-bold text-ink-muted transition-all hover:bg-background"
              >
                Rechazar
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
