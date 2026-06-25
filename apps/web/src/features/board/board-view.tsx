import Link from "next/link";
import type {
  BoardInsights,
  BoardWithColumns,
  Project,
  WorkspaceWithRole,
} from "@todo-list-poc-infra/types";
import { CreateColumnForm } from "./create-column-form";
import { CreateTaskForm } from "./create-task-form";
import { TaskCard } from "./task-card";
import { deleteColumnAction } from "./board.actions";

/**
 * Vista del tablero (server). Columnas en fila horizontal con sus tarjetas; panel
 * Sidekick (IA heurística). Escritura para owner/admin/member; viewer solo lee.
 */
export function BoardView({
  workspace,
  project,
  board,
  insights,
}: {
  workspace: WorkspaceWithRole;
  project: Project;
  board: BoardWithColumns;
  insights: BoardInsights;
}) {
  const canEdit =
    workspace.role === "owner" || workspace.role === "admin" || workspace.role === "member";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href={`/w/${workspace.id}/projects/${project.id}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted transition-colors hover:text-primary"
      >
        ← Volver a {project.name}
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black tracking-tight text-ink">
          <span className="font-mono text-xl" style={{ color: project.color }}>
            {project.key}
          </span>{" "}
          · Tablero
        </h1>
      </div>

      <SidekickPanel insights={insights} />

      <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((col) => {
          const colTasks = board.tasks.filter((t) => t.columnId === col.id);
          const overWip = col.wipLimit != null && colTasks.length > col.wipLimit;
          return (
            <div key={col.id} className="w-72 shrink-0 rounded-card bg-background/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink">{col.name}</p>
                <span
                  className={`rounded-pill px-2 py-0.5 text-[11px] font-bold ${
                    overWip ? "bg-red-100 text-red-700" : "bg-primary-fixed text-primary"
                  }`}
                >
                  {colTasks.length}
                  {col.wipLimit != null ? `/${col.wipLimit}` : ""}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    workspaceId={workspace.id}
                    projectId={project.id}
                    task={task}
                    columns={board.columns}
                    canEdit={canEdit}
                  />
                ))}
              </div>

              {canEdit && (
                <>
                  <CreateTaskForm
                    workspaceId={workspace.id}
                    projectId={project.id}
                    columnId={col.id}
                  />
                  {colTasks.length === 0 && (
                    <form
                      action={deleteColumnAction.bind(null, workspace.id, project.id, col.id)}
                      className="mt-2"
                    >
                      <button
                        type="submit"
                        className="text-[11px] font-bold text-ink-muted hover:text-red-600"
                      >
                        Borrar columna
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          );
        })}

        {canEdit && <CreateColumnForm workspaceId={workspace.id} projectId={project.id} />}
      </div>
    </main>
  );
}

function SidekickPanel({ insights }: { insights: BoardInsights }) {
  return (
    <section className="mt-6 rounded-card bg-surface p-5 shadow-candy-tertiary">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <h2 className="text-lg font-bold text-ink">AI Sidekick</h2>
        <span className="rounded-pill bg-tertiary/10 px-2 py-0.5 text-[10px] font-bold text-tertiary">
          {insights.generatedBy === "heuristic" ? "heurístico" : "IA"}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {insights.insights.map((ins, i) => (
          <li
            key={i}
            className={`rounded-card px-3 py-2 text-sm ${
              ins.severity === "warning"
                ? "bg-amber-50 text-amber-800"
                : "bg-background text-ink-muted"
            }`}
          >
            {ins.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
