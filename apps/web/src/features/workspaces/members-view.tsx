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
        className="text-sm font-bold text-ink-muted hover:text-primary"
      >
        ← {workspace.name}
      </Link>

      <header className="mt-4 flex items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight">Miembros</h1>
        <span className="rounded-pill bg-primary-fixed px-3 py-0.5 text-sm font-bold text-primary">
          {members.length}
        </span>
      </header>

      {isOwner && (
        <div className="mt-6">
          <AddMemberForm workspaceId={workspace.id} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {members.map((m) => (
          <MemberRow
            key={m.userId}
            workspaceId={workspace.id}
            member={m}
            canManage={isOwner}
          />
        ))}
      </div>
    </main>
  );
}
