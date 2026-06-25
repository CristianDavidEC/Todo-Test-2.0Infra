"use client";

import { useActionState } from "react";
import { createTaskAction, type ActionState } from "./board.actions";

/** Form compacto para crear tarjeta dentro de una columna (client). */
export function CreateTaskForm({
  workspaceId,
  projectId,
  columnId,
}: {
  workspaceId: string;
  projectId: string;
  columnId: string;
}) {
  const action = createTaskAction.bind(null, workspaceId, projectId, columnId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-2">
      <input
        name="title"
        type="text"
        required
        maxLength={200}
        placeholder="+ Nueva tarjeta"
        className="w-full rounded-pill bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-2 flex items-center gap-2">
        <select
          name="priority"
          defaultValue="medium"
          className="rounded-pill bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select>
        <input
          name="estimate"
          type="number"
          min={0}
          max={1000}
          placeholder="pts"
          className="w-16 rounded-pill bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-pill bg-primary px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Añadir"}
        </button>
      </div>
      {state.error && <p className="mt-1 text-[11px] text-red-600">{state.error}</p>}
    </form>
  );
}
