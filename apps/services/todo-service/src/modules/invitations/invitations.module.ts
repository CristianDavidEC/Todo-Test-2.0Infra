import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AuthModule } from "../../auth/auth.module";
import { WorkspaceMemberGuard } from "../workspaces/workspace-member.guard";
import {
  InvitationsController,
  WorkspaceInvitationsController,
} from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { InvitationMailer, LoggingInvitationMailer } from "./invitation.mailer";

/**
 * Módulo M3 (Invitaciones). Reusa `WorkspaceMemberGuard` (re-registrado, no se exporta
 * desde WorkspacesModule). `InvitationMailer` = seam; el adapter por defecto loguea
 * (SES real = runbook).
 */
@Module({
  imports: [DbModule, AuthModule],
  controllers: [WorkspaceInvitationsController, InvitationsController],
  providers: [
    InvitationsService,
    WorkspaceMemberGuard,
    { provide: InvitationMailer, useClass: LoggingInvitationMailer },
  ],
})
export class InvitationsModule {}
