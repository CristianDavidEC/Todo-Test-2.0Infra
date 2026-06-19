/**
 * Utilidades para clasificar y configurar comportamiento por stage.
 *
 * Categorías de stage:
 * - Personal: cualquier stage no listado en SHARED_ENVIRONMENTS (típicamente "<github-username>")
 * - Shared: dev, staging, prod
 * - Production: solo prod
 */

const SHARED_ENVIRONMENTS = ["dev", "staging", "prod"] as const;
type SharedStage = (typeof SHARED_ENVIRONMENTS)[number];

/**
 * Stage personal: cualquiera que NO sea dev/staging/prod.
 * Stages personales pueden recibir cleanup automático.
 */
export function isPersonalStage(stage: string): boolean {
  return !SHARED_ENVIRONMENTS.includes(stage as SharedStage);
}

/**
 * Stage compartido del equipo (dev, staging, prod).
 */
export function isSharedStage(stage: string): boolean {
  return SHARED_ENVIRONMENTS.includes(stage as SharedStage);
}

/**
 * Producción específicamente.
 */
export function isProduction(stage: string): boolean {
  return stage === "prod";
}

/**
 * Staging específicamente.
 */
export function isStaging(stage: string): boolean {
  return stage === "staging";
}

/**
 * Retención de CloudWatch Logs por stage, como clave de retención de SST.
 * Producción guarda más tiempo; stages personales lo mínimo.
 *
 * Nota: SST ya aplica un default de "1 month" a Lambda y ECS, así que esto NO evita
 * "logs eternos" (no era el caso) — lo hace stage-aware: los stages personales/dev
 * expiran en 1 semana en vez de 1 mes. Los valores DEBEN ser claves válidas de la
 * tabla de retención de SST (1,3,5,7,14,30,… días → "1 week"/"2 weeks"/"1 month").
 */
export type LogRetention = "1 week" | "2 weeks" | "1 month";

export function getLogRetention(stage: string): LogRetention {
  if (isProduction(stage)) return "1 month";
  if (isStaging(stage)) return "2 weeks";
  // dev shared + stages personales
  return "1 week";
}

/**
 * Política de remoción de recursos al destruir el stack.
 * Producción usa "retain" para evitar pérdida accidental de datos.
 */
export function getRemovalPolicy(stage: string): "retain" | "remove" {
  return isProduction(stage) ? "retain" : "remove";
}

/**
 * Tamaño base de tasks ECS por stage.
 * Stages no-prod usan el mínimo viable; prod escala.
 */
export function getEcsTaskSize(
  stage: string,
): { cpu: "0.25 vCPU" | "0.5 vCPU"; memory: `${number} GB` } {
  // Fargate solo admite combinaciones válidas cpu/memory: "0.5 vCPU" exige
  // mínimo "1 GB"; "0.25 vCPU" admite "0.5 GB". Ver tabla de Fargate.
  if (isProduction(stage)) return { cpu: "0.5 vCPU", memory: "1 GB" };
  if (isStaging(stage)) return { cpu: "0.5 vCPU", memory: "1 GB" };
  // dev + personales
  return { cpu: "0.25 vCPU", memory: "0.5 GB" };
}

/**
 * Número de instancias para HA por stage.
 */
export function getEcsTaskCount(stage: string): { min: number; max: number } {
  if (isProduction(stage)) return { min: 2, max: 4 };
  return { min: 1, max: 1 };
}
