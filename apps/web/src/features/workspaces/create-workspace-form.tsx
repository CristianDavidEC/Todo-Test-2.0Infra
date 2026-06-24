"use client";

import { useActionState, useState } from "react";
import { WORKSPACE_COLOR_PRESETS } from "@todo-list-poc-infra/types";
import { createWorkspaceAction, type ActionState } from "./workspaces.actions";

const ICON_CHOICES = ["🍭", "🚀", "🎯", "🍬", "✨", "🦄", "🌈", "🔥", "💡", "🧁"];

/**
 * Form de creación de workspace (BR-1, BR-9). Client component: color e ícono se
 * eligen del preset Candy y viajan como campos ocultos. La validación real (Zod)
 * y el alta ocurren en la server action; aquí solo damos feedback.
 */
export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createWorkspaceAction,
    {},
  );
  const [color, setColor] = useState<string>(WORKSPACE_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>(ICON_CHOICES[0]);

  return (
    <form action={formAction} className="rounded-card bg-surface p-6 shadow-candy-primary">
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card text-2xl"
          style={{ backgroundColor: `${color}22` }}
        >
          {icon}
        </span>
        <div className="flex-1">
          <label htmlFor="ws-name" className="text-sm font-bold text-ink-muted">
            Nombre del workspace
          </label>
          <input
            id="ws-name"
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Mi equipo"
            className="mt-1 w-full rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-ink-muted">Color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORKSPACE_COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-9 w-9 rounded-pill transition-transform hover:scale-110 ${
                color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-ink-muted">Ícono</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ICON_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={`flex h-9 w-9 items-center justify-center rounded-pill text-lg transition-transform hover:scale-110 ${
                icon === e ? "bg-primary-fixed ring-2 ring-primary" : "bg-background"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />

      {state.error && (
        <p className="mt-4 rounded-card bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-pill bg-primary px-5 py-3 font-bold text-white shadow-candy-primary transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear workspace"}
      </button>
    </form>
  );
}
