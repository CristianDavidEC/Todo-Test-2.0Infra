"use client";

import { useActionState, useState } from "react";
import { WORKSPACE_COLOR_PRESETS } from "@todo-list-poc-infra/types";
import { createProjectAction, type ActionState } from "./projects.actions";

/**
 * Form de creación de proyecto (BR-2, BR-3, BR-9). Client component: color se elige
 * del preset Candy y viaja como campo oculto; la `key` se fuerza a mayúsculas. La
 * validación real (Zod) y el alta ocurren en la server action.
 */
export function CreateProjectForm({ workspaceId }: { workspaceId: string }) {
  const action = createProjectAction.bind(null, workspaceId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [color, setColor] = useState<string>(WORKSPACE_COLOR_PRESETS[0]);
  const [key, setKey] = useState<string>("");

  return (
    <form action={formAction} className="rounded-card bg-surface p-6 shadow-candy-primary">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="p-name" className="text-sm font-bold text-ink-muted">
            Nombre del proyecto
          </label>
          <input
            id="p-name"
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Lanzamiento App"
            className="mt-1 w-full rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="p-key" className="text-sm font-bold text-ink-muted">
            Clave
          </label>
          <input
            id="p-key"
            name="key"
            type="text"
            required
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            pattern="[A-Z0-9]{2,10}"
            title="2–10 caracteres en MAYÚSCULAS o dígitos"
            placeholder="APP"
            className="mt-1 w-full rounded-pill bg-background px-4 py-2.5 font-mono uppercase tracking-wide text-ink outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="p-desc" className="text-sm font-bold text-ink-muted">
          Descripción <span className="font-normal">(opcional)</span>
        </label>
        <textarea
          id="p-desc"
          name="description"
          maxLength={500}
          rows={2}
          placeholder="¿De qué trata el proyecto?"
          className="mt-1 w-full rounded-card bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <div>
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
        <div>
          <label htmlFor="p-status" className="text-sm font-bold text-ink-muted">
            Estado
          </label>
          <select
            id="p-status"
            name="status"
            defaultValue="active"
            className="mt-2 block rounded-pill bg-background px-4 py-2.5 text-ink outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Activo</option>
            <option value="paused">En pausa</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      <input type="hidden" name="color" value={color} />

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
        {pending ? "Creando…" : "Crear proyecto"}
      </button>
    </form>
  );
}
