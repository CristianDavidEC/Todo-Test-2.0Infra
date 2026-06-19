/**
 * Tags estándar para todo recurso AWS del stack.
 *
 * Se aplican GLOBALMENTE vía `defaultTags` del provider `aws` en `sst.config.ts`:
 * Pulumi los hereda automáticamente a CADA recurso creado por el provider, así que
 * NO hay que etiquetar recurso por recurso. Para un tag específico de un recurso
 * (p.ej. `Name`), añádelo en ese recurso — se mergea encima de estos.
 *
 * Funciones PURAS (reciben `appName`/`stage`): se invocan desde `app(input)` en
 * sst.config.ts, donde los globales `$app` aún no existen. SST además añade sus
 * propios `sst:app` / `sst:stage`; estos complementan con `StageType` y, en stages
 * personales, `Creator` (útil para auditar/limpiar stages efímeros).
 */

import { isPersonalStage } from "../helpers/stage";

/** Tags comunes a todos los stages. */
export function getCommonTags(appName: string, stage: string): Record<string, string> {
  return {
    App: appName,
    Stage: stage,
    ManagedBy: "sst",
    StageType: isPersonalStage(stage) ? "personal" : "shared",
  };
}

/**
 * Tag extra para stages personales: `Creator` (del ENV USER del dev), para saber
 * de quién es cada stage efímero. (Un tag `LastActivity` con timestamp forzaría un
 * diff de tags en CADA deploy; se omite hasta que exista un cleanup job que lo use.)
 */
export function getPersonalStageTags(stage: string): Record<string, string> {
  if (!isPersonalStage(stage)) return {};

  return {
    Creator: process.env.USER ?? "unknown",
  };
}

/**
 * Conjunto completo de tags para un stage. Se pasa a `defaultTags.tags` del
 * provider `aws` en sst.config.ts. `extra` permite añadir tags puntuales.
 */
export function getAllTags(
  appName: string,
  stage: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    ...getCommonTags(appName, stage),
    ...getPersonalStageTags(stage),
    ...extra,
  };
}
