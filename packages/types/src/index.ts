/**
 * @todo-list-poc-infra/types
 *
 * Paquete de tipos y schemas Zod compartidos entre apps.
 * Convención: schemas Zod son la source of truth; los tipos TS se infieren con z.infer.
 *
 * Reglas:
 * - Si un tipo lo usa más de una app → va aquí.
 * - Si solo lo usa una app → va local en esa app.
 * - Todo evento de dominio se define con defineEvent() para validación runtime.
 */

export * from "./events/domain-event";
export * from "./schemas/user";
