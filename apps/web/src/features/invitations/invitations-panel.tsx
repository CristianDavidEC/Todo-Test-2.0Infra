import type { Invitation } from "@todo-list-poc-infra/types";
import { InviteForm } from "./invite-form";
import { revokeInvitationAction } from "./invitations.actions";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Miembro",
  viewer: "Viewer",
};

/**
 * Panel de invitaciones (server) — solo para owner/admin. Form de invitar + lista de
 * pendientes con revocar (server action inline).
 */
export function InvitationsPanel({
  workspaceId,
  invitations,
}: {
  workspaceId: string;
  invitations: Invitation[];
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-ink">Invitaciones</h2>
      <InviteForm workspaceId={workspaceId} />

      {invitations.length > 0 && (
        <ul className="mt-4 space-y-2">
          {invitations.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3 shadow-candy-secondary"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{inv.email}</p>
                <span className="mt-0.5 inline-block rounded-pill bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-primary">
                  {ROLE_LABELS[inv.role] ?? inv.role} · pendiente
                </span>
              </div>
              <form action={revokeInvitationAction.bind(null, workspaceId, inv.id)}>
                <button
                  type="submit"
                  className="rounded-pill border-2 border-red-300 px-4 py-1.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50"
                >
                  Revocar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
