"use client";

import { useActionState } from "react";
import { createColumnAction, type ActionState } from "./board.actions";

/** Form para crear una columna (client). */
export function CreateColumnForm({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const action = createColumnAction.bind(null, workspaceId, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="w-72 shrink-0 rounded-card bg-surface/60 p-3">
      <input
        name="name"
        type="text"
        required
        maxLength={60}
        placeholder="+ Nueva columna"
        className="w-full rounded-pill bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          name="wipLimit"
          type="number"
          min={1}
          placeholder="WIP"
          className="w-20 rounded-pill bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-pill bg-primary px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Crear"}
        </button>
      </div>
      {state.error && <p className="mt-1 text-[11px] text-red-600">{state.error}</p>}
    </form>
  );
}
