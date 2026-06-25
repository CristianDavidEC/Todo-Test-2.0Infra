import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { User } from "@todo-list-poc-infra/types";
import { Auth0Guard } from "../../auth/auth0.guard";
import { WorkspaceMemberGuard } from "../workspaces/workspace-member.guard";
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator";
import { InvitationsService } from "./invitations.service";
import { CreateInvitationSchema } from "./invitations.dto";

interface AuthedRequest {
  user: User;
}

/**
 * `/api/workspaces/:id/invitations` — gestión de invitaciones (M3). owner/admin
 * (`@WorkspaceRoles('owner','admin')`), reusa `WorkspaceMemberGuard`.
 */
@ApiTags("invitations")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
@ApiParam({ name: "id", format: "uuid", description: "ID del workspace" })
@Controller("workspaces/:id/invitations")
@UseGuards(Auth0Guard, WorkspaceMemberGuard)
@WorkspaceRoles("owner", "admin")
export class WorkspaceInvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: "Invitar por email", description: "owner/admin. Devuelve el token (dev/link)." })
  @ApiCreatedResponse({ description: "Invitación creada (incluye token)" })
  @ApiForbiddenResponse({ description: "Requiere rol owner/admin" })
  @ApiConflictResponse({ description: "Ya hay una invitación pendiente para ese email (BR-6)" })
  create(@Param("id") workspaceId: string, @Req() req: AuthedRequest, @Body() body: unknown) {
    const dto = CreateInvitationSchema.parse(body);
    return this.invitations.create(workspaceId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Listar invitaciones pendientes", description: "owner/admin." })
  @ApiOkResponse({ description: "Invitaciones pendientes (sin token)" })
  list(@Param("id") workspaceId: string) {
    return this.invitations.listPending(workspaceId);
  }

  @Delete(":invitationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revocar invitación", description: "owner/admin." })
  @ApiParam({ name: "invitationId", format: "uuid" })
  @ApiForbiddenResponse({ description: "Requiere rol owner/admin" })
  @ApiNotFoundResponse({ description: "No existe o no está pendiente" })
  revoke(
    @Param("id") workspaceId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.revoke(workspaceId, invitationId);
  }
}

/**
 * `/api/invitations/:token` — flujo del invitado (M3). Solo requiere estar autenticado
 * (NO membership previa): el token + el email del usuario autorizan la operación.
 */
@ApiTags("invitations")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
@Controller("invitations")
@UseGuards(Auth0Guard)
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Get(":token")
  @ApiOperation({ summary: "Preview de una invitación" })
  @ApiOkResponse({ description: "Datos para la pantalla de aceptar" })
  @ApiNotFoundResponse({ description: "Token inválido" })
  preview(@Param("token") token: string) {
    return this.invitations.preview(token);
  }

  @Post(":token/accept")
  @ApiOperation({ summary: "Aceptar invitación", description: "Crea la membership (BR-4/BR-5)." })
  @ApiOkResponse({ description: "Aceptada; membership creada" })
  @ApiForbiddenResponse({ description: "La invitación es para otro email" })
  @ApiNotFoundResponse({ description: "Token inválido" })
  @ApiConflictResponse({ description: "Ya no está pendiente, o ya eres miembro" })
  @ApiGoneResponse({ description: "La invitación expiró" })
  accept(@Param("token") token: string, @Req() req: AuthedRequest) {
    return this.invitations.accept(token, req.user.id, req.user.email);
  }

  @Post(":token/decline")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Rechazar invitación" })
  decline(@Param("token") token: string) {
    return this.invitations.decline(token);
  }
}
