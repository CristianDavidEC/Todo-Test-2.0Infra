/**
 * Lectura de env vars con fail-fast por categoría de stage.
 *
 * Misma filosofía que los throws de `vpc.ts`/`neon.ts`: en stages COMPARTIDOS
 * (dev/staging/prod) una config crítica ausente debe ROMPER el deploy, no producir
 * un servicio "verde pero roto" que dependa del `.env` de quien deployó. En stages
 * PERSONALES devuelve "" (la config opcional —p.ej. Auth0— puede faltar en local;
 * el sitio sigue funcional vía guards como `isAuth0Configured`).
 */

import { isSharedStage } from "./stage";

export function requireSharedEnv(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (!isSharedStage($app.stage)) return "";
  throw new Error(
    `Env var ${name} requerida para el stage compartido '${$app.stage}'.\n` +
      `Setéala en .env (o en el entorno de CI) antes de deployar.`,
  );
}
