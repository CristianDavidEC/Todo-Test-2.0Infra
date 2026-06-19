import type { z } from "zod";
import type { Actor, DomainEvent } from "@todo-list-poc-infra/types";

// `globalThis.crypto` (Web Crypto) existe en Node 22+, edge y browser → `@todo-list-poc-infra/core`
// se mantiene usable en cualquier runtime (no se importa `node:crypto`).

export interface BuildEventInput {
  source: string;
  correlationId: string;
  causationId?: string;
  actor?: Actor;
}

export function buildEvent<TType extends string, TDataSchema extends z.ZodTypeAny>(
  def: { type: TType; version: string; schema: z.ZodType<DomainEvent<TType, z.infer<TDataSchema>>>; dataSchema: TDataSchema },
  data: z.infer<TDataSchema>,
  meta: BuildEventInput,
): DomainEvent<TType, z.infer<TDataSchema>> {
  const envelope = {
    id: globalThis.crypto.randomUUID(),
    type: def.type,
    version: def.version,
    occurredAt: new Date().toISOString(),
    source: meta.source,
    correlationId: meta.correlationId,
    causationId: meta.causationId,
    actor: meta.actor,
    data,
  };
  return def.schema.parse(envelope);
}
