import { z } from "zod";

export const ActorSchema = z.object({
  type: z.enum(["user", "system", "service"]),
  id: z.string().optional(),
});

export const DomainEventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+$/, "version debe ser MAJOR.MINOR"),
  occurredAt: z.string().datetime(),
  source: z.string().min(1),
  correlationId: z.string().min(1),
  causationId: z.string().optional(),
  actor: ActorSchema.optional(),
});

export type DomainEventEnvelope = z.infer<typeof DomainEventEnvelopeSchema>;
export type Actor = z.infer<typeof ActorSchema>;

export type DomainEvent<TType extends string, TData> = DomainEventEnvelope & {
  type: TType;
  data: TData;
};

export function defineEvent<TType extends string, TSchema extends z.ZodTypeAny>(
  type: TType,
  version: string,
  dataSchema: TSchema,
) {
  const schema = DomainEventEnvelopeSchema.extend({
    type: z.literal(type),
    version: z.literal(version),
    data: dataSchema,
  });
  return {
    type,
    version,
    schema,
    dataSchema,
  } as const;
}
