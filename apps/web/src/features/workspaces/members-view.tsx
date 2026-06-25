import Link from "next/link";
import type { Invitation, WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { InvitationsPanel } from "@/features/invitations/invitations-panel";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

/**
 * Vista de `/w/[id]/members` (server, presentacional). Owner/Admin ven los forms de
 * gestión (agregar, invitar, controles por fila); el resto solo ve la lista.
 */
export function MembersView({
  workspace,
  members,
  invitations = [],
}: {
  workspace: WorkspaceWithRole;
  members: WorkspaceMember[];
  invitations?: Invitation[];
}) {
  const canManage = workspace.role === "owner" || workspace.role === "admin";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/w/${workspace.id}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-primary transition-colors"
      >
        ← Volver a {workspace.name}
      </Link>

      <header className="mt-6 rounded-card bg-surface p-6 shadow-candy-secondary">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">👥 Miembros del equipo</h1>
            <p className="mt-2 text-ink-muted">Gestiona quién tiene acceso al workspace</p>
          </div>
          <div className="rounded-pill bg-primary-fixed px-4 py-2 text-center">
            <p className="text-xs font-bold text-ink-muted">Total</p>
            <p className="text-2xl font-black text-primary">{members.length}</p>
          </div>
        </div>
      </header>

      {canManage && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink mb-4">Agregar nuevo miembro</h2>
          <AddMemberForm workspaceId={workspace.id} />
          <p className="mt-3 text-xs text-ink-muted">
            💡 Para usuarios ya registrados. Para invitar por email a alguien nuevo, usa Invitaciones.
          </p>
        </section>
      )}

      {canManage && (
        <InvitationsPanel workspaceId={workspace.id} invitations={invitations} />
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink mb-4">
          {canManage ? "Gestionar miembros" : "Miembros"}
        </h2>
        {members.length === 0 ? (
          <div className="rounded-card bg-surface p-8 text-center shadow-candy-secondary">
            <p className="text-lg text-ink-muted">Aún no hay miembros en este workspace</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <MemberRow
                key={m.userId}
                workspaceId={workspace.id}
                member={m}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
