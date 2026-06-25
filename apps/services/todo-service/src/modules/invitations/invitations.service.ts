import { randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InvitationEmailMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotPendingError,
  InvitationsRepository,
  UsersRepository,
  WorkspacesRepository,
  type InvitationRow,
} from "@todo-list-poc-infra/db";
import { InvitationMailer } from "./invitation.mailer";
import type {
  CreateInvitationDto,
  InvitationDto,
  InvitationPreviewDto,
  InvitationRole,
  InvitationWithTokenDto,
} from "./invitations.dto";

const INVITE_TTL_DAYS = 7;

/**
 * Lógica del recurso `invitations` (M3). Genera token opaco + expiración, persiste,
 * "envía" email vía el seam `InvitationMailer`, y orquesta la aceptación (que crea la
 * membership). Traduce errores de dominio del repo a HttpException.
 */
@Injectable()
export class InvitationsService {
  constructor(
    @Inject(InvitationsRepository) private readonly invitationsRepo: InvitationsRepository,
    @Inject(UsersRepository) private readonly usersRepo: UsersRepository,
    @Inject(WorkspacesRepository) private readonly workspacesRepo: WorkspacesRepository,
    @Inject(InvitationMailer) private readonly mailer: InvitationMailer,
  ) {}

  /** Crea invitación pendiente + dispara email (BR-2/BR-6/BR-7). */
  async create(
    workspaceId: string,
    invitedBy: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationWithTokenDto> {
    // El invitador es miembro (lo garantiza el guard); reusamos su lookup para el nombre.
    const workspace = await this.workspacesRepo.findByIdForUser(workspaceId, invitedBy);

    // BR-7: no invitar a alguien que YA es miembro.
    const existingUser = await this.usersRepo.findByEmail(dto.email);
    if (existingUser) {
      const alreadyMember = await this.workspacesRepo.findByIdForUser(
        workspaceId,
        existingUser.id,
      );
      if (alreadyMember) throw new ConflictException("Ese usuario ya es miembro del workspace");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
    const row = await this.invitationsRepo.create({
      workspaceId,
      email: dto.email,
      role: dto.role,
      token,
      invitedBy,
      expiresAt,
    });

    const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
    await this.mailer.send({
      to: row.email,
      workspaceName: workspace?.name ?? "el workspace",
      role: row.role,
      acceptUrl: `${base}/invite/${token}`,
    });

    return { ...toInvitation(row), token: row.token };
  }

  async listPending(workspaceId: string): Promise<InvitationDto[]> {
    const rows = await this.invitationsRepo.listPendingForWorkspace(workspaceId);
    return rows.map(toInvitation);
  }

  async revoke(workspaceId: string, invitationId: string): Promise<void> {
    const row = await this.invitationsRepo.revoke(workspaceId, invitationId);
    if (!row) throw new NotFoundException("Invitación no encontrada");
  }

  /** Preview para la pantalla de aceptar (sin requerir membership). */
  async preview(token: string): Promise<InvitationPreviewDto> {
    const inv = await this.invitationsRepo.findByTokenWithWorkspace(token);
    if (!inv) throw new NotFoundException("Invitación no encontrada");
    return {
      workspaceName: inv.workspaceName,
      workspaceColor: inv.workspaceColor,
      workspaceIcon: inv.workspaceIcon,
      role: inv.role as InvitationRole,
      email: inv.email,
      status: inv.status as InvitationPreviewDto["status"],
      expired: inv.expiresAt.getTime() < Date.now(),
    };
  }

  /** Acepta → crea membership con el rol invitado (BR-4/BR-5). */
  async accept(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<{ workspaceId: string; role: string }> {
    try {
      return await this.invitationsRepo.accept(token, userId, userEmail);
    } catch (err) {
      throw translateDomainError(err);
    }
  }

  async decline(token: string): Promise<void> {
    await this.invitationsRepo.decline(token);
  }
}

function translateDomainError(err: unknown): unknown {
  if (err instanceof InvitationNotFoundError) return new NotFoundException(err.message);
  if (err instanceof InvitationNotPendingError) return new ConflictException(err.message);
  if (err instanceof InvitationExpiredError) return new GoneException(err.message);
  if (err instanceof InvitationEmailMismatchError) return new ForbiddenException(err.message);
  return err;
}

function toInvitation(row: InvitationRow): InvitationDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role as InvitationRole,
    status: row.status as InvitationDto["status"],
    invitedBy: row.invitedBy,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
