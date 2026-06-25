# Spec & Plan — Módulo M3: Invitaciones y Roles (RBAC en BD)

> SDD. Mismo mecanismo que [M1](m1-workspaces.md)/[M2](m2-projects.md). Decisiones del 2026-06-24.
> Estado: **implementado** (código + gates offline `type-check lint build` = 20/20 ✓). Runtime/SES = runbook.

---

## Contexto
Fase 1 · Fundación, paso 4. M1 (Workspaces) y M2 (Proyectos) listos. M3 añade el flujo de
**invitaciones por email** y expande el RBAC de 2 a 4 roles. Depende de M1 (membership) y reusa
`WorkspaceMemberGuard` + `@WorkspaceRoles`.

## A. Definición funcional (CERRADA)

### Decisiones (autónomas, alineadas al doc §M3)
1. **Roles ampliados:** `owner | admin | member | viewer` (`WorkspaceRoleSchema`). Jerarquía:
   - **owner**: todo, incl. archivar workspace y transferir/asignar owner. Invariante BR-5 (≥1 owner).
   - **admin**: gestiona miembros, invitaciones y proyectos; NO archiva workspace ni quita el último owner.
   - **member**: lee + edita contenido (tableros/tareas en M4); no gestiona.
   - **viewer**: solo lectura.
2. **Invitaciones por email:** invitar a un email (registrado o no) a un workspace con un rol. El
   invitado acepta tras loguearse → se crea su membership. Token opaco + expiración (7 días).
3. **Email = seam, no SES aún:** el envío vive tras una interfaz `InvitationMailer` con adapter por
   defecto que **loguea** (Pino). SES real = runbook (infra no configurada). El token se devuelve en la
   respuesta del POST (dev) para poder probar sin email.
4. **Gestión owner+admin:** crear/listar/revocar invitaciones y gestionar miembros lo hacen owner y
   admin. Se actualizan los `@WorkspaceRoles('owner')` de M1/M2 a `('owner','admin')` donde el doc dice
   "Owner/Admin", salvo destructivo de workspace (archivar) y tocar owners (solo owner).
5. **ProjectMember (acceso granular por proyecto): DIFERIDO** — igual criterio que M2. La autorización
   sigue siendo a nivel workspace. Se documenta como corte de alcance; el override por proyecto se
   añadirá cuando haya un caso real. (El doc lo lista en M3; se posterga por correctness/scope.)

### Reglas de negocio
| # | Regla |
|---|---|
| BR-1 | Roles: owner/admin/member/viewer. owner+admin gestionan; member edita; viewer lee. |
| BR-2 | Crear invitación: owner/admin. Email + rol (no `owner` por invitación; owner se asigna aparte). |
| BR-3 | Token único, opaco; `status` ∈ pending/accepted/revoked; `expiresAt` (7 días). |
| BR-4 | Aceptar: el email del invitado debe coincidir con el del usuario autenticado → si no, 403. Token inválido/expirado/no-pending → 409/410. |
| BR-5 | Aceptar crea membership con el rol invitado (idempotente: si ya es miembro → 409). Marca invitación `accepted`. |
| BR-6 | Re-invitar a un email con invitación `pending` viva → 409 (unique parcial sobre pending). |
| BR-7 | No se puede invitar a alguien que YA es miembro → 409. |
| BR-8 | Cambiar rol: owner/admin. Degradar/quitar al último owner → 409 (BR-5 de M1, reusado). admin no puede crear/ascender a owner (solo owner asigna owner). |
| BR-9 | Aislamiento de tenant: invitaciones scoped por workspace; token global pero validado contra estado. |

## B. Arquitectura

### B.1 Schema (`packages/db/.../schema.ts`, append)
```
invitations
  id uuid pk · workspaceId uuid → workspaces.id (cascade) · email text notNull
  role text notNull (admin|member|viewer)  · token text notNull · status text notNull default 'pending'
  invitedBy uuid → users.id · expiresAt timestamptz notNull · createdAt/updatedAt timestamptz
  uniqueIndex token (token)
  uniqueIndex parcial (workspaceId, lower(email)) WHERE status='pending'   ← BR-6 (una pending por email/ws)
  idx (workspaceId)
```
Tipos `InvitationRow`/`NewInvitationRow`.

### B.2 Repos
- **`InvitationsRepository`** (nuevo): `create`, `listPendingForWorkspace`, `findByToken`, `findByIdInWorkspace`, `markAccepted(tx?)`, `revoke`, helper de expiración. Aceptar = transacción: valida + crea membership (reusa `WorkspacesRepository.addMemberByUserId`) + marca accepted (se hace en el service orquestando ambos repos con `withTransaction`, o un método combinado en `WorkspacesRepository`). **Decisión:** método `acceptInvitation` en `InvitationsRepository` que recibe el `userId`, hace `withTransaction`: relee invitación FOR UPDATE, inserta membership, marca accepted.
- **`WorkspacesRepository`**: `changeRole` ya valida BR-5; ajustar para permitir 4 roles (sigue igual, role es string). Añadir guard "admin no asigna owner" en el service.
- Barrels: adapter `export *`; **top-level `src/index.ts` named** (añadir `InvitationsRepository`, `InvitationRow`, `NewInvitationRow`, `InvitationStatus`, `CreateInvitationInput`).

### B.3 Tipos (`packages/types/src/schemas/invitation.ts`, nuevo) + expandir `workspace.ts`
- `WorkspaceRoleSchema` → `z.enum(["owner","admin","member","viewer"])`.
- `InvitationRoleSchema` = `z.enum(["admin","member","viewer"])` (no owner por invitación).
- `InvitationStatusSchema`, `InvitationSchema` (token NO se expone en listados salvo en create), `CreateInvitationSchema` ({email, role}), `InvitationPreviewSchema` ({workspaceName, role, status}).
- Barrel.

### B.4 NestJS
- **Expandir** `@WorkspaceRoles('owner')` → `('owner','admin')` en: M1 add/changeRole/removeMember (mantener archive/branding owner-only), M2 projects create/update/archive.
- **`InvitationsModule`** (`modules/invitations/`): controller/service/dto/module + `InvitationMailer` (token interface + `LoggingInvitationMailer` default).
  - Rutas workspace-scoped (reusa `WorkspaceMemberGuard`, `@WorkspaceRoles('owner','admin')`):
    | METHOD | path | rol |
    |---|---|---|
    | POST | `/workspaces/:id/invitations` | owner/admin |
    | GET | `/workspaces/:id/invitations` | owner/admin |
    | DELETE | `/workspaces/:id/invitations/:invitationId` | owner/admin |
  - Rutas por token (solo Auth0Guard, sin membership previa):
    | GET | `/invitations/:token` | authed (preview) |
    | POST | `/invitations/:token/accept` | authed (BR-4/BR-5) |
    | POST | `/invitations/:token/decline` | authed |
  - Service traduce dominio→HTTP (expirada→410 Gone, no-pending/duplicado→409, email mismatch→403, not found→404).
- Wiring: `DbModule` provee `InvitationsRepository`; `AppModule` importa `InvitationsModule`; `main.ts` tag swagger; `InvitationMailer` provider en el módulo.

### B.5 Web (`features/invitations/`)
- `invitations.api.ts` (reusa `WorkspaceApiError`), `invitations.actions.ts`.
- En `members-view` (M1): si owner/admin, sección "Invitaciones" (form invitar por email+rol, lista de pending con revocar).
- Ruta `app/invite/[token]/page.tsx`: preview + aceptar/rechazar (thin).
- Candy tokens reuse.

## C. Orden
Fase 1 Datos → Fase 2 Tipos (+ expandir roles) → Fase 3 API (+ ajustar decorators M1/M2) → Fase 4 Web → Fase 5 gates.

## D. Verificación
- `pnpm turbo run type-check lint build` verde.
- Swagger: invitar (201 + token), re-invitar pending (409), invitar a miembro (409), aceptar (crea membership), aceptar con email distinto (403), aceptar expirada (410), revocar (owner/admin), member intenta invitar (403).
- Runtime/SES: runbook (no offline).

## E. Riesgos
- **Unicidad parcial sobre `lower(email)` + status='pending':** drizzle `uniqueIndex().on(sql lower(email))...where(...)`; verificar el SQL generado.
- **Aceptar = carrera:** `withTransaction` + relectura FOR UPDATE de la invitación evita doble aceptación.
- **Expansión de roles** rompe nada si guard usa `includes`; los datos viejos siguen siendo owner/member válidos.
