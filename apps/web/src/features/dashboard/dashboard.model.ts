import { nextSessionToAuthSession, type NextAuth0Session } from "@todo-list-poc-infra/auth/nextjs";

/**
 * Vista-modelo del dashboard, derivada de la sesión Auth0.
 *
 * Esto es lógica de DOMINIO de la feature (qué se muestra y bajo qué rol), no
 * un detalle HTTP — por eso vive en `features/dashboard/`, no en la ruta.
 */
export interface DashboardModel {
  displayName: string;
  subject: string;
  isAdmin: boolean;
}

/**
 * Mapea la sesión Auth0 (Next SDK) → modelo del dashboard.
 *
 * RBAC claim-based: los roles llegan en el JWT bajo el namespace Auth0
 * (`https://app.example.com/roles` por defecto). Sin Action/RBAC configurado en
 * el tenant, `roles` queda vacío y `isAdmin` es `false`.
 */
export function toDashboardModel(
  session: NextAuth0Session,
  namespace?: string,
): DashboardModel {
  const authSession = nextSessionToAuthSession(session, namespace);
  return {
    displayName: session.user.name ?? session.user.email ?? session.user.sub,
    subject: session.user.sub,
    isAdmin: authSession.roles.includes("admin"),
  };
}
