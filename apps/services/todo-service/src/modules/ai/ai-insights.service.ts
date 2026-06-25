import { Injectable } from "@nestjs/common";
import type { BoardColumnRow, TaskRow } from "@todo-list-poc-infra/db";
import type { BoardInsight, BoardInsights } from "@todo-list-poc-infra/types";

/**
 * AI Sidekick (M4) — SEAM. Hoy produce un análisis **heurístico** offline (sin LLM):
 * columnas sobre su WIP, tarjetas sin responsable/estimación, tablero vacío. La
 * integración real con Claude/Anthropic es un runbook (ver skill `claude-api`): se
 * sustituiría esta clase (o se añadiría un `LlmInsightsService`) detrás de la misma
 * interfaz, orquestando prompts + contexto del tablero + control de coste (AIInteraction).
 */
@Injectable()
export class AiInsightsService {
  analyzeBoard(columns: BoardColumnRow[], tasks: TaskRow[]): BoardInsights {
    const insights: BoardInsight[] = [];

    if (tasks.length === 0) {
      insights.push({
        kind: "empty_board",
        severity: "info",
        message: "El tablero está vacío. Crea tu primera tarjeta para empezar.",
      });
      return { generatedBy: "heuristic", insights };
    }

    // WIP excedido por columna.
    const liveByColumn = new Map<string, number>();
    for (const t of tasks) {
      liveByColumn.set(t.columnId, (liveByColumn.get(t.columnId) ?? 0) + 1);
    }
    for (const col of columns) {
      if (col.wipLimit != null) {
        const live = liveByColumn.get(col.id) ?? 0;
        if (live > col.wipLimit) {
          insights.push({
            kind: "wip_exceeded",
            severity: "warning",
            message: `La columna "${col.name}" tiene ${live} tarjetas y su límite WIP es ${col.wipLimit}. Es un posible cuello de botella.`,
          });
        }
      }
    }

    // Tarjetas sin responsable.
    const unassigned = tasks.filter((t) => !t.assigneeId).length;
    if (unassigned > 0) {
      insights.push({
        kind: "unassigned",
        severity: unassigned > 3 ? "warning" : "info",
        message: `${unassigned} tarjeta(s) sin responsable. Asignar dueños mejora la rendición de cuentas.`,
      });
    }

    // Tarjetas sin estimación (necesarias para velocity/forecast en M7).
    const noEstimate = tasks.filter((t) => t.estimate == null).length;
    if (noEstimate > 0) {
      insights.push({
        kind: "no_estimate",
        severity: "info",
        message: `${noEstimate} tarjeta(s) sin estimación. Estimar habilita métricas de velocidad y pronóstico.`,
      });
    }

    if (insights.length === 0) {
      insights.push({ kind: "ok", severity: "info", message: "El tablero se ve saludable 🎉" });
    }
    return { generatedBy: "heuristic", insights };
  }
}
