export interface Auth0Config {
  domain: string;
  audience: string;
  clientId?: string;
  namespace?: string;
  issuer?: string;
}

export function resolveAuth0Config(overrides?: Partial<Auth0Config>): Auth0Config {
  const domain = overrides?.domain ?? process.env.AUTH0_DOMAIN;
  const audience = overrides?.audience ?? process.env.AUTH0_AUDIENCE;
  if (!domain) throw new Error("AUTH0_DOMAIN no está definida");
  if (!audience) throw new Error("AUTH0_AUDIENCE no está definida");

  return {
    domain,
    audience,
    clientId: overrides?.clientId ?? process.env.AUTH0_CLIENT_ID,
    namespace: overrides?.namespace ?? process.env.AUTH0_NAMESPACE,
    issuer: overrides?.issuer ?? `https://${domain}/`,
  };
}
