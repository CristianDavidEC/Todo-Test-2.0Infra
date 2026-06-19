import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Auth0Config } from "./types";
import { resolveAuth0Config } from "./types";
import type { Auth0Claims } from "../types/claims";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let cachedConfig: Auth0Config | undefined;

function getJwks(config: Auth0Config) {
  if (!cachedJwks || cachedConfig?.domain !== config.domain) {
    cachedJwks = createRemoteJWKSet(new URL(`https://${config.domain}/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      cacheMaxAge: 600_000,
    });
    cachedConfig = config;
  }
  return cachedJwks;
}

export class JwtVerificationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "JwtVerificationError";
  }
}

export async function verifyAuth0Token(
  token: string,
  configOverrides?: Partial<Auth0Config>,
): Promise<Auth0Claims> {
  const config = resolveAuth0Config(configOverrides);
  const jwks = getJwks(config);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.audience,
    });
    return payload as JWTPayload & Auth0Claims;
  } catch (err) {
    throw new JwtVerificationError(
      err instanceof Error ? err.message : "JWT verification failed",
      err,
    );
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
