export const DEFAULT_REDACT_KEYS = [
  "password",
  "passwd",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "apiKey",
  "secret",
  "clientSecret",
  "sessionSecret",
  "creditCard",
  "ssn",
];

export const PINO_REDACT_PATHS = [
  ...DEFAULT_REDACT_KEYS.map((k) => k),
  ...DEFAULT_REDACT_KEYS.map((k) => `*.${k}`),
  ...DEFAULT_REDACT_KEYS.map((k) => `*.*.${k}`),
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

export const REDACTED = "[REDACTED]";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === "[object Object]";

/**
 * Deep-redacta (sin mutar) cualquier propiedad cuya clave coincida — case-insensitive —
 * con `keys`. Es el equivalente runtime-agnóstico de la opción `redact` de Pino, usado
 * por el `RedactingLogFormatter` de Powertools porque su Logger NO tiene redacción nativa.
 *
 * Recorre objetos planos y arrays; deja intactos Date/Error/Buffer y demás no-planos.
 * Protegido contra referencias circulares.
 */
export function redactObject<T>(input: T, keys: readonly string[] = DEFAULT_REDACT_KEYS): T {
  const redactSet = new Set(keys.map((k) => k.toLowerCase()));
  const seen = new WeakSet<object>();

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      return value.map(walk);
    }
    if (isPlainObject(value)) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = redactSet.has(k.toLowerCase()) ? REDACTED : walk(v);
      }
      return out;
    }
    return value;
  };

  return walk(input) as T;
}
