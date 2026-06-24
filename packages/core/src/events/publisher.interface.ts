import type { DomainEvent } from "@todo-list-poc-infra/types";

/**
 * Interfaz pura para publicar eventos. La implementación concreta (EventBridge,
 * SQS, NATS, etc.) vive fuera de @todo-list-poc-infra/core para mantenerlo libre de deps AWS.
 *
 * Apps en runtime instancian un publisher concreto y lo inyectan en los
 * use-cases que necesiten emitir eventos.
 */
export interface EventPublisher {
  publish<TType extends string, TData>(event: DomainEvent<TType, TData>): Promise<void>;
  publishBatch<TType extends string, TData>(events: DomainEvent<TType, TData>[]): Promise<void>;
}
