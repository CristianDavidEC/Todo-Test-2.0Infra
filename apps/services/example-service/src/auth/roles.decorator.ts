import { SetMetadata } from "@nestjs/common";

/**
 * Marca un handler/controller con los roles requeridos. Lo lee `RolesGuard`.
 *
 * Uso (el orden de guards importa — Auth0Guard primero):
 *   @UseGuards(Auth0Guard, RolesGuard)
 *   @Roles("admin")
 *   adminOnly() { ... }
 */
export const ROLES_KEY = "roles";

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
