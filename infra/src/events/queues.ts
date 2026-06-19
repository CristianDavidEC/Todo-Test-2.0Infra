/**
 * Events — SQS / EventBridge.
 *
 * Vacío a propósito: la base no crea colas ni buses. El patrón estándar de la
 * empresa es EventBridge + SQS + DLQ + idempotencia (no una Queue pelada). Cuando
 * un proyecto lo necesite, implementarlo aquí y añadir `import "./events/queues"`
 * en app.ts. Ver ROADMAP.md (Fase eventos).
 */
export {};
