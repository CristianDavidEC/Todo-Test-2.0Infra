import Link from "next/link";
import type { WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

/**
 * Vista de `/w/[id]/members` (server, presentacional). Owners ven el form de
 * agregar y los controles por fila; los miembros solo ven la lista.
 */
export function MembersView({
  workspace,
  members,
}: {
  workspace: WorkspaceWithRole;
  members: WorkspaceMember[];
}) {
  const isOwner = workspace.role === "owner";

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

      {isOwner && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink mb-4">Agregar nuevo miembro</h2>
          <AddMemberForm workspaceId={workspace.id} />
          <p className="mt-3 text-xs text-ink-muted">
            💡 Solo puedes agregar usuarios que ya estén registrados en CandyProject
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink mb-4">
          {isOwner ? "Gestionar miembros" : "Miembros"}
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
                canManage={isOwner}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
