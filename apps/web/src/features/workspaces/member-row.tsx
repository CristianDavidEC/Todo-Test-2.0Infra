"use client";

import { useActionState } from "react";
import type { WorkspaceMember } from "@todo-list-poc-infra/types";
import {
  changeRoleAction,
  removeMemberAction,
  type ActionState,
} from "./workspaces.actions";

/**
 * Fila de un miembro. Los controles (cambiar rol / remover) solo se renderizan
 * para Owners (`canManage`). El backend igual refuerza: 403 si no es owner, 409
 * si la operación dejaría el workspace sin Owner (BR-5).
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
  const targetRole = member.role === "owner" ? "member" : "owner";
  const [roleState, roleAction, rolePending] = useActionState<ActionState, FormData>(
    changeRoleAction.bind(null, workspaceId, member.userId),
    {},
  );
  const [removeState, removeAction, removePending] = useActionState<ActionState, FormData>(
    removeMemberAction.bind(null, workspaceId, member.userId),
    {},
  );
  const error = roleState.error ?? removeState.error;

  return (
    <div className="rounded-card bg-surface p-5 shadow-candy-secondary transition-all hover:shadow-lg border border-transparent hover:border-primary/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill font-bold text-sm text-white"
            style={{ backgroundColor: member.role === "owner" ? "#e040a0" : "#7c52aa" }}
          >
            {(member.name ?? member.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-ink text-base">{member.name ?? member.email}</p>
            <p className="truncate text-xs text-ink-muted mt-0.5">{member.email}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 flex-wrap justify-end">
          <span
            className={`rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
              member.role === "owner"
                ? "bg-gradient-to-r from-primary to-secondary text-white"
                : "bg-background text-ink-muted border border-ink/10"
            }`}
          >
            {member.role === "owner" ? "👑 Owner" : "👤 Miembro"}
          </span>

          {canManage && (
            <div className="flex items-center gap-2">
              <form action={roleAction}>
                <input type="hidden" name="role" value={targetRole} />
                <button
                  type="submit"
                  disabled={rolePending}
                  className="rounded-pill border-2 border-secondary px-2 py-1 text-xs font-bold text-secondary transition-all hover:bg-secondary hover:text-white hover:scale-105 disabled:opacity-60"
                  title={targetRole === "owner" ? "Promover a Owner" : "Degradar a Miembro"}
                >
                  {targetRole === "owner" ? "👑" : "👤"}
                </button>
              </form>
              <form action={removeAction}>
                <button
                  type="submit"
                  disabled={removePending}
                  className="rounded-pill border-2 border-red-300 px-2 py-1 text-xs font-bold text-red-600 transition-all hover:bg-red-50 hover:scale-105 disabled:opacity-60"
                  title="Remover del workspace"
                >
                  ❌
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-card bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-bold text-red-600">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
