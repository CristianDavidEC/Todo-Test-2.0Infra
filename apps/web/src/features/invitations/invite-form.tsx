"use client";

import { useActionState } from "react";
import { createInvitationAction, type ActionState } from "./invitations.actions";

/** Form de invitar por email + rol (owner/admin). Client: useActionState + .bind. */
export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const action = createInvitationAction.bind(null, workspaceId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="rounded-card bg-surface p-5 shadow-candy-primary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="inv-email" className="text-sm font-bold text-ink-muted">
            Email a invitar
          </label>
          <input
            id="inv-email"
            name="email"
            type="email"
            required
            placeholder="persona@empresa.com"
            className="mt-1 w-full rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="sm:w-44">
          <label htmlFor="inv-role" className="text-sm font-bold text-ink-muted">
            Rol
          </label>
          <select
            id="inv-role"
            name="role"
            defaultValue="member"
            className="mt-1 block w-full rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="admin">Admin</option>
            <option value="member">Miembro</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-primary px-5 py-2.5 font-bold text-white shadow-candy-primary transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? "Invitando…" : "Invitar"}
        </button>
      </div>

      {state.error && (
        <p className="mt-3 rounded-card bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
