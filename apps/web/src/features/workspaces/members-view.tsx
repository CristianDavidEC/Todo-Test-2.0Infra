import Link from "next/link";
import type { WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";
import { WorkspaceNav } from "./workspace-nav";

/**
 * Vista de `/w/[id]/members` — diseño "Meet the Crew" (Stitch / Candy).
 * Owners ven el form de invitar y los controles por tarjeta; los miembros solo
 * ven al equipo. Las stats se derivan de datos reales (no hay capacity/tasks
 * hasta M2). Conexión a la API vía los server components/actions de workspaces.
 */
export function MembersView({
  workspace,
  members,
}: {
  workspace: WorkspaceWithRole;
  members: WorkspaceMember[];
}) {
  const isOwner = workspace.role === "owner";
  const owners = members.filter((m) => m.role === "owner").length;
  const regular = members.length - owners;

  const stats = [
    { value: members.length, label: "Miembros", color: "text-primary" },
    { value: owners, label: "Owners", color: "text-secondary" },
    { value: regular, label: "Colaboradores", color: "text-tertiary" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href={`/w/${workspace.id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
      >
        ← Volver a {workspace.name}
      </Link>

      <WorkspaceNav workspaceId={workspace.id} active="team" />

      {/* Header */}
      <section className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface">Conoce al equipo</h1>
          <p className="mt-1 text-lg text-on-surface-variant">
            El corazón detrás de <span className="font-bold text-primary">{workspace.name}</span>.
          </p>
        </div>
        {/* Stats reales */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bouncy-hover flex min-w-[90px] flex-col items-center justify-center rounded-card border border-outline-variant bg-surface px-5 py-4 text-center"
            >
              <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
              <span className="text-xs font-bold text-on-surface-variant">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Invitar (solo owner) */}
      {isOwner && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-on-surface">Invitar nuevo miembro</h2>
          <AddMemberForm workspaceId={workspace.id} />
          <p className="mt-3 text-xs text-on-surface-variant">
            💡 Solo puedes invitar usuarios que ya estén registrados en CandyProject.
          </p>
        </section>
      )}

      {/* Grid de miembros */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-on-surface">
          {isOwner ? "Gestionar miembros" : "Miembros"}
        </h2>
        {members.length === 0 ? (
          <div className="rounded-card border border-outline-variant bg-surface p-10 text-center shadow-candy-secondary">
            <span className="text-5xl">🫥</span>
            <p className="mt-3 text-lg text-on-surface-variant">Aún no hay miembros en este workspace</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {members.map((m) => (
              <MemberRow key={m.userId} workspaceId={workspace.id} member={m} canManage={isOwner} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
