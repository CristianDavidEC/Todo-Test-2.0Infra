"use client";

import { useActionState } from "react";
import { addMemberAction, type ActionState } from "./workspaces.actions";

/**
 * Form "agregar miembro por email" (BR-6), solo visible para Owners. El usuario
 * debe estar YA registrado; si no, el backend responde 404 y lo mostramos aquí.
 */
export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const action = addMemberAction.bind(null, workspaceId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="rounded-card border border-outline-variant bg-surface p-6 shadow-candy-primary">
      <div className="flex flex-col gap-3">
        <label htmlFor="member-email" className="text-sm font-bold text-on-surface">
          📧 Correo electrónico del nuevo miembro
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <input
            id="member-email"
            name="email"
            type="email"
            required
            placeholder="persona@empresa.com"
            className="flex-1 rounded-pill border-2 border-outline-variant bg-surface-container-low px-5 py-3 text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="bouncy-hover whitespace-nowrap rounded-pill bg-secondary px-8 py-3 font-bold text-on-secondary shadow-candy-secondary transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "⏳ Invitando…" : "＋ Invitar miembro"}
          </button>
        </div>
      </div>

      {state.error && (
        <div className="mt-4 rounded-card border border-error/30 bg-error/10 px-4 py-3">
          <p className="text-sm font-bold text-error">⚠️ {state.error}</p>
        </div>
      )}
    </form>
  );
}
