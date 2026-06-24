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
    <form action={formAction} className="rounded-card bg-gradient-to-br from-surface to-primary/5 p-6 shadow-candy-primary border border-primary/20">
      <div className="flex flex-col gap-3">
        <label htmlFor="member-email" className="text-sm font-bold text-ink">
          📧 Correo electrónico del nuevo miembro
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <input
            id="member-email"
            name="email"
            type="email"
            required
            placeholder="persona@empresa.com"
            className="flex-1 rounded-pill bg-white border-2 border-primary/20 px-5 py-3 text-ink outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-pill bg-gradient-to-r from-primary to-secondary px-8 py-3 font-bold text-white shadow-candy-primary transition-all hover:scale-[1.05] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {pending ? "⏳ Agregando…" : "✅ Agregar"}
          </button>
        </div>
      </div>

      {state.error && (
        <div className="mt-4 rounded-card bg-red-50 border-2 border-red-200 px-4 py-3">
          <p className="text-sm font-bold text-red-600">⚠️ {state.error}</p>
        </div>
      )}
    </form>
  );
}
