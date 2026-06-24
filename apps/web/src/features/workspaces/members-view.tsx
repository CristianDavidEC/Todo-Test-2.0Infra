import type { WorkspaceMember, WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";
import { WorkspaceShell } from "./workspace-shell";

/**
 * Vista `/w/[id]/members` ("Team") — réplica visual de la pantalla Stitch
 * "Gestión de Equipo y Capacidad". Stats y "team health" se derivan de datos
 * reales (no hay capacity/tasks hasta M2). Conexión a la API vía server actions.
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
    { value: members.length, label: "Miembros activos", color: "text-primary" },
    { value: owners, label: "Owners", color: "text-secondary" },
    { value: regular, label: "Colaboradores", color: "text-tertiary" },
    { value: isOwner ? "Owner" : "Miembro", label: "Tu rol", color: "text-on-surface-variant" },
  ];

  return (
    <WorkspaceShell workspace={workspace} title="Equipo">
      <div className="space-y-8">
        {/* Header */}
        <section className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-on-surface">Conoce al equipo</h2>
            <p className="text-lg text-on-surface-variant">
              El corazón detrás de <span className="font-bold text-primary">{workspace.name}</span>.
            </p>
          </div>
        </section>

        {/* AI Health + Stats */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-card border-2 border-primary-container/20 bg-surface-container-low p-8 card-shadow lg:col-span-8">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container">
                <span className="material-symbols-outlined fill text-3xl text-white">smart_toy</span>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-primary">Salud del equipo: ¡Radiante!</h3>
                <p className="text-lg leading-relaxed text-on-surface-variant">
                  Tu workspace tiene <span className="font-bold text-secondary">{members.length} miembros</span>
                  {owners > 0 && (
                    <>
                      , de los cuales <span className="font-bold text-primary">{owners}</span>
                      {owners === 1 ? " es Owner" : " son Owners"}
                    </>
                  )}
                  . {regular > 0 ? `${regular} colaboran activamente.` : "Invita a tu equipo para empezar a construir."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-pill bg-primary-fixed px-4 py-1 text-sm font-bold text-on-primary-fixed-variant">
                    {owners} {owners === 1 ? "Owner" : "Owners"}
                  </span>
                  <span className="rounded-pill bg-tertiary-fixed px-4 py-1 text-sm font-bold text-on-tertiary-fixed-variant">
                    {regular} Colaboradores
                  </span>
                  <span className="rounded-pill bg-secondary-fixed px-4 py-1 text-sm font-bold text-on-secondary-fixed-variant">
                    Estado óptimo
                  </span>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-10">
              <span className="material-symbols-outlined text-[120px] text-primary">celebration</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bouncy flex flex-col items-center justify-center rounded-card border border-outline-variant bg-surface p-6 text-center"
              >
                <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
                <span className="text-xs font-bold text-on-surface-variant">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Invitar (solo owner) */}
        {isOwner && (
          <section>
            <h3 className="mb-4 text-xl font-black text-on-surface">Invitar nuevo miembro</h3>
            <AddMemberForm workspaceId={workspace.id} />
            <p className="mt-3 text-xs text-on-surface-variant">
              💡 Solo puedes invitar usuarios que ya estén registrados en CandyProject.
            </p>
          </section>
        )}

        {/* Grid de miembros */}
        <section>
          <h3 className="mb-4 text-xl font-black text-on-surface">
            {isOwner ? "Gestionar miembros" : "Miembros"}
          </h3>
          {members.length === 0 ? (
            <div className="rounded-card border border-outline-variant bg-surface p-10 text-center card-shadow">
              <span className="text-5xl">🫥</span>
              <p className="mt-3 text-lg text-on-surface-variant">Aún no hay miembros en este workspace</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {members.map((m) => (
                <MemberRow key={m.userId} workspaceId={workspace.id} member={m} canManage={isOwner} />
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
