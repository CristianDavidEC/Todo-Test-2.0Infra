/**
 * Web — Next.js desplegado con OpenNext via sst.aws.Nextjs.
 *
 * En `sst dev`: levanta `next dev` localmente en http://localhost:3000
 * En `sst deploy`: despliega a AWS con CloudFront + Lambda + S3
 *
 * Auth0 (SDK v4): toda la config Y los secretos se inyectan desde process.env
 * — una sola fuente de verdad (en local del `.env`; en deploy, de las Variables/
 * Secrets del GitHub Environment). Sin sst.Secret/SSM.
 *   - CONFIG pública (domain, client_id, audience) → GitHub Variable.
 *   - SECRETOS (client_secret, session_secret)     → GitHub Environment Secret.
 * `requireSharedEnv` hace fail-fast en stages compartidos si alguno falta.
 *
 * Para que el login funcione en runtime, además registrar la callback
 * `${APP_BASE_URL}/auth/callback` en el tenant Auth0. Mientras los secretos no
 * tengan valor real, el guard `isAuth0Configured` de apps/web mantiene el sitio
 * público funcional (auth inerte, sin 500).
 */

import { apiUrl } from "../apis/main-api";
import { requireSharedEnv } from "../helpers/env";

export const web = new sst.aws.Nextjs("Web", {
  path: "apps/web",
  // SST elige OpenNext según la versión de Next; para Next 16 (proxy.ts) hay que
  // forzar OpenNext 4.x (soporte vía Build Adapters API de Next 16.2). Sin esto,
  // SST usa el default 3.9.14 que no entiende proxy.ts → falla el build OpenNext.
  openNextVersion: "4.0.3",
  environment: {
    // Config pública (de .env, leído por SST en deploy). No son secretos.
    // Fail-fast en stages compartidos si falta (ver helpers/env.ts).
    AUTH0_DOMAIN: requireSharedEnv("AUTH0_DOMAIN"),
    AUTH0_CLIENT_ID: requireSharedEnv("AUTH0_CLIENT_ID"),
    AUTH0_AUDIENCE: requireSharedEnv("AUTH0_AUDIENCE"),
    // URL del API para que el frontend sepa a dónde llamar. En local (sst dev)
    // el NestJS corre en localhost:3001; en producción, usa el API Gateway.
    NEXT_PUBLIC_API_URL: $dev ? "http://localhost:3001" : apiUrl,
    // URL base — requerida por Auth0 para construir el redirect_uri del callback.
    // Es distinta en local vs desplegado, por eso es condicional:
    //   - `sst dev` (local live, $dev=true)  → http://localhost:3000
    //   - `sst deploy` ($dev=false)          → la URL del stage (CloudFront), de .env
    // Sin esto, el Lambda desplegado hereda el localhost del .env y el login
    // rebota a localhost (ERR_CONNECTION_REFUSED).
    APP_BASE_URL: $dev ? "http://localhost:3000" : requireSharedEnv("APP_BASE_URL"),
    // Secretos: de process.env igual que la config (GitHub Environment Secret en
    // deploy, .env en local). El SDK pide AUTH0_SECRET para cifrar la cookie de sesión.
    AUTH0_CLIENT_SECRET: requireSharedEnv("AUTH0_CLIENT_SECRET"),
    AUTH0_SECRET: requireSharedEnv("AUTH0_SECRET"),
  },
});
