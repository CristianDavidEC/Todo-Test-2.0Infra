/**
 * DTOs del recurso `users`.
 *
 * Zod es la source of truth (regla del monorepo): los schemas y tipos viven en
 * `@todo-list-poc-infra/types` y aquí solo se re-exportan. No se re-derivan ZodObjects localmente
 * (evita doble instancia de zod → tipos incompatibles / inferencia infinita).
 */
export { CreateUserSchema, PublicUserSchema } from "@todo-list-poc-infra/types";
export type { CreateUser as CreateUserDto, PublicUser as PublicUserDto } from "@todo-list-poc-infra/types";
