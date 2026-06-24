/**
 * Tipos REALES de SST para infra/src.
 *
 * Referencia el archivo generado por SST (`sst install`), que vía `declare global`
 * expone TODOS los globales reales: `sst` (incl. `sst.aws.*`), `aws`, `neon`,
 * `$app`, `$dev`, `$util`, `$interpolate`, `$transform`, `$config`, etc.
 *
 * Requiere `.sst/` generado: si `pnpm --filter @todo-list-poc-infra/infra type-check` falla por
 * globales `sst`/`$app` ausentes, corre `pnpm sst install` una vez para generarlo.
 */
/// <reference path="../../.sst/platform/config.d.ts" />
