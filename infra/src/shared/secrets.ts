/**
 * Manifest declarativo de secrets gestionados vía `sst.Secret` (SSM).
 *
 * POR DEFECTO ESTÁ VACÍO. La plantilla maneja TODAS las credenciales como env vars
 * (una sola fuente de verdad): en local del `.env`, en deploy de las Variables/Secrets
 * del GitHub Environment.
 *
 * Este manifest es un escape-hatch OPCIONAL: si un proyecto necesita que un secreto
 * viva en SSM (encriptado en AWS, fuera del runner de CI) en vez de pasar por env,
 * declara la entrada aquí y setéala con `sst secret set <Name> <value> --stage <stage>`.
 * Cada entrada lleva un `placeholder` para que un clon fresco deploye sin setear valores
 * (sin placeholder, `sst.Secret` rompe el deploy si el valor no existe).
 *
 * NOTA: El connection string a Neon NO se gestiona aquí — viene del Linkable
 * `database` en infra/src/databases/neon.ts.
 */

export interface SecretDescriptor {
  /** Descripción humana (no se consume en runtime). */
  description: string;
  /** Valor por defecto para que el deploy no falle si el secret no está seteado. */
  placeholder: string;
}

export const SECRETS_MANIFEST: Record<string, SecretDescriptor> = {
  // Vacío: los secretos de Auth0 (client_secret, session_secret) ahora se inyectan
  // como env vars desde el GitHub Environment Secret (ver infra/src/webs/web.ts).
  // Añade aquí solo secretos que de verdad quieras en SSM en vez de env.
};

/**
 * Instancias `sst.Secret` para cada entrada del manifest.
 * Usar `secrets.<Name>.value` para inyectar a Lambdas/Services.
 */
export const secrets = Object.fromEntries(
  Object.entries(SECRETS_MANIFEST).map(([name, { placeholder }]) => [
    name,
    new sst.Secret(name, placeholder),
  ]),
) as Record<keyof typeof SECRETS_MANIFEST, sst.Secret>;
