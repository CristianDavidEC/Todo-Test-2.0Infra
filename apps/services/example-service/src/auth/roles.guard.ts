import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { requireAnyRole, type RequestWithAuth } from "@app/auth";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Guard RBAC claim-based. Lee los roles requeridos puestos por `@Roles(...)` y
 * los compara contra `request.session.roles` (poblado previamente por
 * `Auth0Guard`). No toca la base de datos: los roles llegan en el JWT bajo el
 * namespace Auth0 (`readCustomClaims`).
 *
 * IMPORTANTE: debe ejecutarse DESPUÉS de `Auth0Guard`:
 *   @UseGuards(Auth0Guard, RolesGuard)
 * NestJS corre los guards de izquierda a derecha; si se invierte, `session`
 * está vacío y todo devuelve 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    try {
      requireAnyRole(req.session, required);
      return true;
    } catch {
      throw new ForbiddenException(`Requiere uno de los roles: ${required.join(", ")}`);
    }
  }
}
