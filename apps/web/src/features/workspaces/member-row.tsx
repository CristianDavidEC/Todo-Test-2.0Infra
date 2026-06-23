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
    <div className="rounded-card bg-surface p-4 shadow-candy-secondary">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary-fixed text-sm font-bold text-primary">
            {(member.name ?? member.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{member.name ?? member.email}</p>
            <p className="truncate text-xs text-ink-muted">{member.email}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-pill px-3 py-0.5 text-xs font-bold ${
              member.role === "owner"
                ? "bg-primary-fixed text-primary"
                : "bg-background text-ink-muted"
            }`}
          >
            {member.role === "owner" ? "Owner" : "Miembro"}
          </span>

          {canManage && (
            <>
              <form action={roleAction}>
                <input type="hidden" name="role" value={targetRole} />
                <button
                  type="submit"
                  disabled={rolePending}
                  className="rounded-pill border border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-transform hover:scale-105 disabled:opacity-60"
                >
                  {targetRole === "owner" ? "Hacer Owner" : "Hacer Miembro"}
                </button>
              </form>
              <form action={removeAction}>
                <button
                  type="submit"
                  disabled={removePending}
                  className="rounded-pill border border-red-300 px-3 py-1 text-xs font-bold text-red-600 transition-transform hover:scale-105 disabled:opacity-60"
                >
                  Remover
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-card bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
