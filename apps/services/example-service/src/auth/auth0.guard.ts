import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { authorizeRequest, type RequestWithAuth } from "@app/auth";
import { UsersRepository } from "@app/db";
import { setUserId } from "@app/observability";

/**
 * Guard Auth0 idiomático de NestJS.
 *
 * Reutiliza la lógica pura `authorizeRequest()` de `@app/auth` (verifica el JWT
 * vía JWKS público + lazy upsert del usuario en Postgres) y la envuelve en un
 * guard inyectable estáticamente referenciable con `@UseGuards(Auth0Guard)`.
 *
 * Tras `canActivate`, `request.session` y `request.user` quedan poblados.
 */
@Injectable()
export class Auth0Guard implements CanActivate {
  private readonly logger = new Logger(Auth0Guard.name);

  constructor(private readonly usersRepo: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    try {
      const { session, user } = await authorizeRequest(req, { usersRepo: this.usersRepo });
      req.session = session;
      req.user = user;
      // Propaga el userId al contexto de correlación → los logs posteriores lo incluyen.
      // `user` ya es un `User` Zod validado (mapeado en el borde por @app/auth).
      setUserId(user.id);
      return true;
    } catch (err) {
      // No filtrar el motivo del fallo al cliente (p.ej. "JWT missing email claim"):
      // se loguea en el servidor y se responde con un 401 genérico.
      this.logger.debug(err instanceof Error ? err.message : String(err));
      throw new UnauthorizedException("Unauthorized");
    }
  }
}
