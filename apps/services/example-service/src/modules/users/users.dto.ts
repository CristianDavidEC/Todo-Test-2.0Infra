/**
 * DTOs del recurso `users`.
 *
 * Zod es la source of truth (regla del monorepo): los schemas y tipos viven en
 * `@app/types` y aquí solo se re-exportan. No se re-derivan ZodObjects localmente
 * (evita doble instancia de zod → tipos incompatibles / inferencia infinita).
 */
export { CreateUserSchema, PublicUserSchema } from "@app/types";
export type { CreateUser as CreateUserDto, PublicUser as PublicUserDto } from "@app/types";
