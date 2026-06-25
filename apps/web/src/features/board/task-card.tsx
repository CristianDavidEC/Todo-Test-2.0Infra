"use client";

import type { Column, Task } from "@todo-list-poc-infra/types";
import { archiveTaskAction, moveTaskAction, type ActionState } from "./board.actions";
import { useActionState } from "react";

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-tertiary/15 text-tertiary",
  medium: "bg-primary-fixed text-primary",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

/**
 * Tarjeta (client). Mover = select de columna destino + submit (MVP, sin DnD JS).
 * Archivar = server action. La autoría real (RBAC) la refuerza el backend (403).
 */
export function TaskCard({
  workspaceId,
  projectId,
  task,
  columns,
  canEdit,
}: {
  workspaceId: string;
  projectId: string;
  task: Task;
  columns: Column[];
  canEdit: boolean;
}) {
  const moveAction = moveTaskAction.bind(null, workspaceId, projectId, task.id);
  const [moveState, moveFormAction] = useActionState<ActionState, FormData>(moveAction, {});

  return (
    <div className="rounded-card bg-surface p-3 shadow-candy-secondary">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink">{task.title}</p>
        <span
          className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-bold ${
            PRIORITY_STYLE[task.priority] ?? "bg-background text-ink-muted"
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span key={l} className="rounded-pill bg-background px-2 py-0.5 text-[10px] text-ink-muted">
              {l}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-muted">
        {task.estimate != null && <span>· {task.estimate} pts</span>}
      </div>

      {canEdit && (
        <div className="mt-3 flex items-center gap-2">
          <form action={moveFormAction} className="flex-1">
            <select
              name="toColumnId"
              defaultValue={task.columnId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="w-full rounded-pill bg-background px-2 py-1 text-[11px] text-ink outline-none focus:ring-2 focus:ring-primary"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  → {c.name}
                </option>
              ))}
            </select>
          </form>
          <form action={archiveTaskAction.bind(null, workspaceId, projectId, task.id)}>
            <button
              type="submit"
              aria-label="Archivar"
              className="rounded-pill border border-red-200 px-2 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </form>
        </div>
      )}

      {moveState.error && <p className="mt-2 text-[11px] text-red-600">{moveState.error}</p>}
    </div>
  );
}
