import { randomUUID } from "node:crypto";

export const CORRELATION_HEADER = "x-correlation-id";

export function extractCorrelationId(
  headers: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!headers) return randomUUID();
  const raw = headers[CORRELATION_HEADER] ?? headers[CORRELATION_HEADER.toUpperCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.length > 0 ? value : randomUUID();
}

export function injectCorrelationHeader(
  headers: Record<string, string>,
  correlationId: string,
): Record<string, string> {
  return { ...headers, [CORRELATION_HEADER]: correlationId };
}
