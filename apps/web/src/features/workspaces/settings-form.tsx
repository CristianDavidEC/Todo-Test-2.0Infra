"use client";

import { useActionState, useState } from "react";
import { WORKSPACE_COLOR_PRESETS, type WorkspaceWithRole } from "@todo-list-poc-infra/types";
import { updateBrandingAction, type BrandingState } from "./workspaces.actions";

const ICON_CHOICES = ["🍭", "🚀", "🎯", "🍬", "✨", "🦄", "🌈", "🔥", "💡", "🧁"];

/**
 * Form de "Workspace Identity" (pantalla Settings de Stitch). Edita nombre, color
 * e ícono y los persiste vía la API real (`updateBrandingAction` → PATCH /workspaces/:id).
 * Solo-Owner: el backend igual refuerza con 403.
 */
export function SettingsForm({ workspace }: { workspace: WorkspaceWithRole }) {
  const [state, formAction, pending] = useActionState<BrandingState, FormData>(
    updateBrandingAction.bind(null, workspace.id),
    {},
  );
  const [name, setName] = useState(workspace.name);
  const [color, setColor] = useState(
    (WORKSPACE_COLOR_PRESETS as readonly string[]).includes(workspace.color)
      ? workspace.color
      : WORKSPACE_COLOR_PRESETS[0],
  );
  const [icon, setIcon] = useState(workspace.icon || ICON_CHOICES[0]);

  return (
    <form action={formAction} className="rounded-card border border-outline-variant bg-surface p-6 shadow-candy-primary">
      <h2 className="mb-1 text-xl font-black text-on-surface">Identidad del Workspace</h2>
      <p className="mb-6 text-sm text-on-surface-variant">Nombre y marca visible para todo el equipo.</p>

      <div className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card text-3xl"
          style={{ backgroundColor: `${color}22` }}
        >
          {icon}
        </span>
        <div className="flex-1">
          <label htmlFor="ws-name" className="text-sm font-bold text-on-surface-variant">
            Nombre del workspace
          </label>
          <input
            id="ws-name"
            name="name"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-pill border-2 border-outline-variant bg-surface-container-low px-4 py-2.5 text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-on-surface-variant">Paleta de marca</p>
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
        <p className="text-sm font-bold text-on-surface-variant">Ícono</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ICON_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className={`flex h-9 w-9 items-center justify-center rounded-pill text-lg transition-transform hover:scale-110 ${
                icon === e ? "bg-primary-fixed ring-2 ring-primary" : "bg-surface-container-low"
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
        <p className="mt-4 rounded-card border border-error/30 bg-error/10 px-4 py-2 text-sm font-bold text-error">
          ⚠️ {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 rounded-card border border-tertiary/30 bg-tertiary-container/40 px-4 py-2 text-sm font-bold text-on-tertiary-container">
          ✓ Cambios guardados
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bouncy-hover mt-6 rounded-pill bg-primary px-8 py-3 font-bold text-on-primary shadow-candy-primary disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
