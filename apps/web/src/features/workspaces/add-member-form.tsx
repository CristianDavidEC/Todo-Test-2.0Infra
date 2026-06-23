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
    <form action={formAction} className="rounded-card bg-surface p-5 shadow-candy-primary">
      <label htmlFor="member-email" className="text-sm font-bold text-ink-muted">
        Agregar miembro por email
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="member-email"
          name="email"
          type="email"
          required
          placeholder="persona@empresa.com"
          className="flex-1 rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-primary px-6 py-2.5 font-bold text-white shadow-candy-primary transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          {pending ? "Agregando…" : "Agregar"}
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
