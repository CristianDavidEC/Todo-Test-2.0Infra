import { Injectable, Logger } from "@nestjs/common";

export interface InvitationEmail {
  to: string;
  workspaceName: string;
  role: string;
  /** Link de aceptación (front), p.ej. `${APP_BASE_URL}/invite/${token}`. */
  acceptUrl: string;
}

/**
 * Seam de envío de invitaciones (M3). La implementación real (SES) es un runbook:
 * la infra de email no está configurada en la base. Token de DI para poder sustituir
 * el adapter sin tocar el service.
 */
export abstract class InvitationMailer {
  abstract send(email: InvitationEmail): Promise<void>;
}

/**
 * Adapter por defecto: loguea el "envío" (Pino) en vez de mandar email. Permite
 * probar el flujo completo sin SES. Reemplazar por `SesInvitationMailer` cuando se
 * configure SES (ver ROADMAP / runbook).
 */
@Injectable()
export class LoggingInvitationMailer extends InvitationMailer {
  private readonly logger = new Logger("InvitationMailer");

  async send(email: InvitationEmail): Promise<void> {
    this.logger.log(
      `[invite] to=${email.to} workspace="${email.workspaceName}" role=${email.role} url=${email.acceptUrl}`,
    );
  }
}
