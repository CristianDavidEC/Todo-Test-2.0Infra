import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { User } from "@todo-list-poc-infra/types";
import type { WorkspaceWithRole } from "@todo-list-poc-infra/db";
import { Auth0Guard } from "../../auth/auth0.guard";
import { WorkspaceMemberGuard } from "./workspace-member.guard";
import { WorkspaceRoles } from "./workspace-roles.decorator";
import { WorkspacesService } from "./workspaces.service";
import {
  AddMemberSchema,
  ChangeRoleSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceBrandingSchema,
} from "./workspaces.dto";

interface AuthedRequest {
  user: User; // poblado por Auth0Guard (class-level)
  membership?: WorkspaceWithRole; // poblado por WorkspaceMemberGuard
}

const WORKSPACE_EXAMPLE = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Mi Workspace",
  color: "#e040a0",
  icon: "🍭",
  createdBy: "11111111-1111-1111-1111-111111111111",
  archivedAt: null,
  createdAt: "2026-06-23T00:00:00.000Z",
  updatedAt: "2026-06-23T00:00:00.000Z",
  role: "owner",
};

const MEMBER_EXAMPLE = {
  userId: "11111111-1111-1111-1111-111111111111",
  email: "user@example.com",
  name: "Jane Doe",
  picture: "https://example.com/avatar.png",
  role: "member",
  createdAt: "2026-06-23T00:00:00.000Z",
};

/**
 * `/api/workspaces` — multi-tenancy (M1). JWT Auth0 obligatorio (class-level).
 * El RBAC por workspace lo aplica `WorkspaceMemberGuard` por ruta (404 si no es
 * miembro, 403 si el rol no alcanza). Validación de body con Zod (`.parse` →
 * ZodError → 400 vía `AllExceptionsFilter`).
 */
@ApiTags("workspaces")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Falta o es inválido el Bearer token" })
@Controller("workspaces")
@UseGuards(Auth0Guard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: "Crear workspace", description: "El creador queda Owner (BR-1)." })
  @ApiCreatedResponse({ description: "Workspace creado", schema: { example: WORKSPACE_EXAMPLE } })
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    const dto = CreateWorkspaceSchema.parse(body);
    return this.workspaces.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Listar mis workspaces", description: "Activos, con mi rol (BR-8, BR-10)." })
  @ApiOkResponse({ description: "Lista de workspaces", schema: { example: [WORKSPACE_EXAMPLE] } })
  list(@Req() req: AuthedRequest) {
    return this.workspaces.listForUser(req.user.id);
  }

  @Get(":id")
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: "Detalle de un workspace" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Workspace", schema: { example: WORKSPACE_EXAMPLE } })
  @ApiNotFoundResponse({ description: "No existe o no eres miembro" })
  getById(@Req() req: AuthedRequest) {
    return this.workspaces.getDetail(req.membership!);
  }

  @Patch(":id")
  @UseGuards(WorkspaceMemberGuard)
  @WorkspaceRoles("owner")
  @ApiOperation({ summary: "Editar branding", description: "Solo Owner (BR-4)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Workspace actualizado", schema: { example: WORKSPACE_EXAMPLE } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "No existe o no eres miembro" })
  updateBranding(@Param("id") id: string, @Body() body: unknown) {
    const dto = UpdateWorkspaceBrandingSchema.parse(body);
    return this.workspaces.updateBranding(id, dto);
  }

  @Delete(":id")
  @UseGuards(WorkspaceMemberGuard)
  @WorkspaceRoles("owner")
  @ApiOperation({ summary: "Archivar workspace", description: "Soft-delete; solo Owner (BR-8)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Workspace archivado", schema: { example: { ...WORKSPACE_EXAMPLE, archivedAt: "2026-06-23T00:00:00.000Z" } } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  archive(@Param("id") id: string) {
    return this.workspaces.archive(id);
  }

  @Get(":id/members")
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: "Listar miembros" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ description: "Miembros del workspace", schema: { example: [MEMBER_EXAMPLE] } })
  listMembers(@Param("id") id: string) {
    return this.workspaces.listMembers(id);
  }

  @Post(":id/members")
  @UseGuards(WorkspaceMemberGuard)
  @WorkspaceRoles("owner")
  @ApiOperation({ summary: "Agregar miembro por email", description: "Usuario ya registrado → member (BR-6). Solo Owner." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiCreatedResponse({ description: "Miembro agregado", schema: { example: MEMBER_EXAMPLE } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "El email no corresponde a un usuario registrado" })
  @ApiConflictResponse({ description: "El usuario ya es miembro" })
  addMember(@Param("id") id: string, @Body() body: unknown) {
    const dto = AddMemberSchema.parse(body);
    return this.workspaces.addMember(id, dto);
  }

  @Patch(":id/members/:userId/role")
  @UseGuards(WorkspaceMemberGuard)
  @WorkspaceRoles("owner")
  @ApiOperation({ summary: "Cambiar rol de un miembro", description: "Solo Owner. No puede dejar 0 Owners (BR-5)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "userId", format: "uuid" })
  @ApiOkResponse({ description: "Rol actualizado", schema: { example: { userId: MEMBER_EXAMPLE.userId, role: "owner" } } })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "El usuario no es miembro" })
  @ApiConflictResponse({ description: "Dejaría al workspace sin Owner (BR-5)" })
  changeRole(
    @Param("id") id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() body: unknown,
  ) {
    const dto = ChangeRoleSchema.parse(body);
    return this.workspaces.changeRole(id, userId, dto.role);
  }

  @Delete(":id/members/:userId")
  @UseGuards(WorkspaceMemberGuard)
  @WorkspaceRoles("owner")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover miembro", description: "Solo Owner. No puede dejar 0 Owners (BR-5)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiParam({ name: "userId", format: "uuid" })
  @ApiForbiddenResponse({ description: "Requiere rol owner" })
  @ApiNotFoundResponse({ description: "El usuario no es miembro" })
  @ApiConflictResponse({ description: "Dejaría al workspace sin Owner (BR-5)" })
  removeMember(@Param("id") id: string, @Param("userId", ParseUUIDPipe) userId: string) {
    return this.workspaces.removeMember(id, userId);
  }

  @Post(":id/leave")
  @UseGuards(WorkspaceMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Salir del workspace", description: "Auto-salida (BR-7). No puede dejar 0 Owners (BR-5)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNotFoundResponse({ description: "No eres miembro" })
  @ApiConflictResponse({ description: "Dejaría al workspace sin Owner (BR-5)" })
  leave(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.workspaces.leave(id, req.user.id);
  }
}
