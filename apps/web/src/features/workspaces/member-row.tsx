"use client";

import { useActionState } from "react";
import type { WorkspaceMember } from "@todo-list-poc-infra/types";
import {
  changeRoleAction,
  removeMemberAction,
  type ActionState,
} from "./workspaces.actions";

/**
 * Tarjeta de un miembro — diseño "Meet the Crew" (Stitch / Candy). Avatar con
 * ring, nombre, rol con acento de color y, para Owners (`canManage`), controles
 * de cambiar rol / remover. El backend refuerza: 403 si no es owner, 409 si la
 * operación dejaría al workspace sin Owner (BR-5).
 */
export function MemberRow({
  workspaceId,
  member,
  canManage,
}: {
  workspaceId: string;
  member: WorkspaceMember;
  canManage: boolean;
}) {
  const isOwner = member.role === "owner";
  const targetRole = isOwner ? "member" : "owner";
  const accent = isOwner ? "#e040a0" : "#7c52aa";

  const [roleState, roleAction, rolePending] = useActionState<ActionState, FormData>(
    changeRoleAction.bind(null, workspaceId, member.userId),
    {},
  );
  const [removeState, removeAction, removePending] = useActionState<ActionState, FormData>(
    removeMemberAction.bind(null, workspaceId, member.userId),
    {},
  );
  const error = roleState.error ?? removeState.error;
  const initial = (member.name ?? member.email).charAt(0).toUpperCase();

  return (
    <div className="bouncy group rounded-card border border-outline-variant bg-surface p-6 card-shadow">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {member.picture ? (
            <div
              className="h-16 w-16 shrink-0 rounded-full bg-cover bg-center ring-4 ring-background"
              style={{ backgroundImage: `url(${member.picture})`, boxShadow: `0 0 0 4px ${accent}` }}
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-black text-white ring-4 ring-background"
              style={{ backgroundColor: accent, boxShadow: `0 0 0 4px ${accent}55` }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="truncate text-xl font-black text-on-surface">{member.name ?? "Sin nombre"}</h4>
            <p className="text-sm font-bold" style={{ color: accent }}>
              {isOwner ? "Lead / Owner" : "Colaborador"}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-pill px-3 py-1 text-xs font-bold ${
            isOwner ? "bg-primary text-on-primary" : "bg-secondary-fixed text-on-secondary-fixed-variant"
          }`}
        >
          {isOwner ? "👑 Owner" : "👤 Miembro"}
        </span>
      </div>

      <div className="rounded-card bg-surface-container-high p-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Email</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <p className="truncate text-sm font-bold text-on-surface">{member.email}</p>
        </div>
      </div>

      {canManage && (
        <div className="mt-4 flex items-center gap-2">
          <form action={roleAction} className="flex-1">
            <input type="hidden" name="role" value={targetRole} />
            <button
              type="submit"
              disabled={rolePending}
              className="bouncy-hover w-full rounded-pill border-2 border-secondary px-3 py-2 text-xs font-bold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-60"
            >
              {rolePending ? "…" : targetRole === "owner" ? "👑 Promover a Owner" : "👤 Pasar a Miembro"}
            </button>
          </form>
          <form action={removeAction}>
            <button
              type="submit"
              disabled={removePending}
              className="bouncy-hover rounded-pill border-2 border-error/40 px-3 py-2 text-xs font-bold text-error transition-colors hover:bg-error/10 disabled:opacity-60"
              title="Remover del workspace"
            >
              {removePending ? "…" : "Remover"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-card border border-error/30 bg-error/10 px-4 py-3">
          <p className="text-sm font-bold text-error">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
