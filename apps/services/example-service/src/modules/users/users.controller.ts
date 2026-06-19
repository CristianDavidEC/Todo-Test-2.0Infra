import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthSession } from "@app/auth";
import { Auth0Guard } from "../../auth/auth0.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { UsersService } from "./users.service";

interface AuthedRequest {
  session?: AuthSession;
  user?: unknown;
}

// Ejemplos para Swagger (los DTOs son Zod, no clases → describimos el shape aquí).
const PUBLIC_USER_EXAMPLE = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "user@example.com",
  name: "Jane Doe",
  picture: "https://example.com/avatar.png",
  locale: "es",
  createdAt: "2026-06-02T00:00:00.000Z",
  lastSeenAt: "2026-06-02T00:00:00.000Z",
};

/**
 * `/api/users` — lectura protegida. Requiere JWT Auth0 válido (no es público:
 * expone PII). NO hay endpoint de creación: el alta de usuarios ocurre vía
 * `lazyUpsert` en el primer login autenticado (ver Auth0Guard / UsersRepository),
 * no por POST con `auth0UserId` arbitrario. Un proyecto que necesite gestión
 * administrativa de usuarios debe añadir endpoints con `@Roles("admin")`.
 */
@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(Auth0Guard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Listar usuarios", description: "Devuelve hasta 50 usuarios." })
  @ApiOkResponse({ description: "Lista de usuarios", schema: { example: [PUBLIC_USER_EXAMPLE] } })
  @ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
  list() {
    return this.users.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener usuario por id" })
  @ApiParam({ name: "id", description: "UUID del usuario", format: "uuid" })
  @ApiOkResponse({ description: "Usuario encontrado", schema: { example: PUBLIC_USER_EXAMPLE } })
  @ApiNotFoundResponse({ description: "Usuario no encontrado" })
  @ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
  getById(@Param("id") id: string) {
    return this.users.getById(id);
  }
}

/**
 * `/api/me` — requiere JWT Auth0 válido. El guard hace lazy upsert y deja el
 * usuario sincronizado en `request.user`.
 */
@ApiTags("me")
@ApiBearerAuth()
@Controller("me")
@UseGuards(Auth0Guard)
export class MeController {
  @Get()
  @ApiOperation({
    summary: "Usuario autenticado",
    description: "Devuelve la sesión y el usuario sincronizado en Postgres (lazy upsert).",
  })
  @ApiOkResponse({
    description: "Sesión + usuario",
    schema: {
      example: {
        session: { auth0UserId: "auth0|abc123", email: "user@example.com", roles: [], permissions: [] },
        user: PUBLIC_USER_EXAMPLE,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
  me(@Req() req: AuthedRequest) {
    return { session: req.session, user: req.user };
  }

  /**
   * Ejemplo RBAC: ruta protegida por rol. El `Auth0Guard` a nivel de clase ya
   * valida el JWT y puebla `session.roles` desde los custom claims; aquí solo
   * añadimos `RolesGuard`, que exige el rol "admin". (No repetir Auth0Guard: el
   * class-level lo aplica una vez — duplicarlo causa doble verificación/upsert.)
   */
  @Get("admin/ping")
  @UseGuards(RolesGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Ruta solo-admin (ejemplo RBAC)",
    description: "Requiere JWT válido con el rol 'admin' en los custom claims.",
  })
  @ApiOkResponse({ description: "Acceso concedido", schema: { example: { ok: true } } })
  @ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
  @ApiForbiddenResponse({ description: "El usuario no tiene el rol 'admin'" })
  adminPing() {
    return { ok: true };
  }
}
