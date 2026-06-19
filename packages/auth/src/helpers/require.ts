import type { AuthSession } from "../types/session";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireUser(session: AuthSession | null | undefined): AuthSession {
  if (!session) throw new UnauthorizedError();
  return session;
}

export function requireRole(session: AuthSession | null | undefined, role: string): AuthSession {
  const s = requireUser(session);
  if (!s.roles.includes(role)) throw new ForbiddenError(`Falta rol: ${role}`);
  return s;
}

export function requireAnyRole(
  session: AuthSession | null | undefined,
  roles: string[],
): AuthSession {
  const s = requireUser(session);
  if (!roles.some((r) => s.roles.includes(r))) {
    throw new ForbiddenError(`Requiere uno de: ${roles.join(", ")}`);
  }
  return s;
}

export function requirePermission(
  session: AuthSession | null | undefined,
  permission: string,
): AuthSession {
  const s = requireUser(session);
  if (!s.permissions.includes(permission)) {
    throw new ForbiddenError(`Falta permission: ${permission}`);
  }
  return s;
}
