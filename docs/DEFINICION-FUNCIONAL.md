# Definición Funcional — Plataforma de Gestión de Proyectos Inteligente

> Producto: sistema de gestión de proyectos con tablero Kanban, sprints, métricas y una
> capa de IA transversal (asistente, insights, pronósticos, automatizaciones). Sistema de
> diseño: **Candy**. Stack: el monorepo actual (Next.js 16 + NestJS/Fargate + Lambdas +
> Neon/Postgres + Auth0 + SST). Este documento define **qué** se construye; la arquitectura
> de **cómo** vive en los `AGENTS.md` por carpeta.

Estado: **borrador para validar**. Las 3 decisiones estructurales pendientes están al final (§7).

---

## 1. Consecuencias arquitectónicas que el requerimiento ya fuerza

Antes de los módulos, dos conclusiones que **no son opcionales** dado lo pedido ("invitar a
mis proyectos", "admins", roles):

1. **RBAC con respaldo en BD (no solo claims de Auth0).** Hoy la plantilla autoriza por
   roles globales en el JWT de Auth0. Invitar usuarios a proyectos concretos y tener admins
   *por proyecto/workspace* exige roles como **dato de dominio**: tablas `membership`
   (usuario × ámbito × rol) e `invitation`. **Auth0 sigue siendo identidad/login**; la
   autorización por ámbito pasa a la BD. Es la mayor desviación de la base.

2. **Jerarquía de tenancy de 3 niveles.** Branding del workspace, gestión de equipo
   transversal y "Recent Wins" a nivel equipo implican un nivel **Workspace** por encima de
   **Proyecto**:

   ```
   Workspace (org, tenant)  →  Project  →  { Board, Sprint }  →  Task
   ```

   Membership y roles viven a nivel **Workspace**, con override opcional por **Project**.

---

## 2. Modelo de dominio (entidades núcleo)

Define el mínimo persistente. **Crítico:** las métricas (burndown, velocity, forecast)
**solo son posibles si se persiste historia desde el día 1** — marcado con ⚠️.

| Entidad | Campos clave | Notas |
|---|---|---|
| `User` | id, auth0UserId, email, name, picture | Ya existe. Identidad global (Auth0). |
| `Workspace` | id, name, slug, branding (color/logo), createdBy | Tenant raíz. |
| `Membership` | id, workspaceId, userId, role, status | Rol a nivel workspace. |
| `Invitation` | id, workspaceId, email, role, token, status, expiresAt, invitedBy | Flujo de invitación por email. |
| `Project` | id, workspaceId, name, key, description, status, color | Todo cuelga de aquí. |
| `ProjectMember` | id, projectId, userId, roleOverride? | Acceso/rol por proyecto (opcional sobre el de workspace). |
| `Board` | id, projectId, name | Un tablero por proyecto (MVP). |
| `Column` | id, boardId, name, order, wipLimit? | Estados del flujo (To Do / Doing / Done…). |
| `Task` | id, projectId, columnId, title, description, priority, assigneeId, **estimate** ⚠️, sprintId?, order, labels[], dueDate? | Tarjeta. `estimate` (story points) es obligatorio para velocity. |
| `TaskStatusHistory` ⚠️ | id, taskId, fromColumn, toColumn, byUserId, at | **Sin esto no hay burndown ni cycle-time.** Una fila por cada cambio de columna. |
| `Sprint` | id, projectId, name, goal, startDate, endDate, status (planned/active/closed), **closedThroughput** ⚠️ | Sprints cerrados se persisten con su throughput para el histórico del forecast. |
| `Comment` | id, taskId, authorId, body, mentions[], createdAt | Comentarios + menciones. |
| `Attachment` | id, taskId, key (S3), filename, size, uploadedBy | "Assets" → bucket S3. |
| `ActivityLog` | id, workspaceId, actor, entity, action, payload, at | Feed de actividad + auditoría. |
| `Notification` | id, userId, type, payload, readAt | In-app; algunas disparan email. |
| `Automation` | id, workspaceId, trigger, action, enabled, config | Reglas (p. ej. resumen semanal). |
| `AIInteraction` | id, scope, prompt, response, model, tokens, cost, at | Trazabilidad/coste de la capa IA. |

---

## 3. Capa transversal de IA (se define **una vez**)

La IA aparece en casi todos los módulos (Sidekick, Insights, Forecast, Automatizaciones).
Es **una capacidad compartida**, no un módulo. Sobre **Claude / Anthropic** (consultar la
skill `claude-api` en fase de implementación).

- **Dónde vive (decidido):** integrada en `todo-service` (NestJS) como un módulo propio de
  orquestación — no en el frontend. Jobs pesados/asíncronos (resúmenes, forecast batch) vía
  cola (`infra/events/queues.ts`, hoy vacío). Se aísla en su propio módulo Nest para poder
  extraerla a un servicio dedicado si la carga lo exige.
- **Responsabilidades:** orquestación de prompts, contexto del tablero/proyecto, rate
  limiting, control de coste/tokens (`AIInteraction`), manejo de fallos y *fallbacks*.
- **Capacidades expuestas:** (1) chat con contexto del proyecto, (2) sugerencias sobre una
  tarea, (3) detección de cuellos de botella/bloqueos, (4) forecast de fecha de fin, (5)
  análisis de salud de equipo, (6) resúmenes automáticos.
- Cada módulo abajo **consume** estas capacidades; no las redefine.

---

## 4. Módulos funcionales

Formato fijo por módulo: **Qué hace / Quién (roles) / Datos / IA / Infra que requiere.**

### M0 · Identidad y Acceso *(Auth0 — ya existe la base)*
- **Qué:** login/logout, sesión, perfil. Registro implícito en primer login (lazy upsert ya implementado).
- **Quién:** cualquier usuario autenticado.
- **Datos:** `User`.
- **IA:** —
- **Infra:** Auth0 (ya configurado), `packages/auth`.

### M1 · Workspaces (multi-tenancy)
- **Qué:** crear/seleccionar workspace, branding (color/logo), ajustes generales. Aislamiento de datos por tenant.
- **Quién:** creador = Owner; resto según membership.
- **Datos:** `Workspace`, `Membership`.
- **IA:** —
- **Infra:** nuevas tablas Drizzle.

### M2 · Proyectos *(entidad central — antes no listada como módulo)*
- **Qué:** CRUD de proyectos dentro de un workspace, estado, color/clave, ajustes.
- **Quién:** Owner/Admin crean; Member ve los que le pertenecen.
- **Datos:** `Project`, `ProjectMember`.
- **IA:** —
- **Infra:** tablas + API NestJS.

### M3 · Invitaciones y Roles (RBAC en BD)
- **Qué:** invitar por email a un workspace/proyecto, aceptar/rechazar, gestionar miembros, asignar roles. Roles propuestos: **Owner, Admin, Member, Viewer**.
- **Quién:** Owner/Admin invitan y gestionan roles; el invitado acepta.
- **Datos:** `Invitation`, `Membership`, `ProjectMember`.
- **IA:** —
- **Infra:** tablas + **envío de email (SES)** para la invitación.

### M4 · Tablero Kanban Inteligente
- **Qué:** columnas configurables, tarjetas con prioridad/responsable/labels, drag & drop entre columnas, WIP limits. Actualización **en tiempo real** entre usuarios.
- **Quién:** Member+ edita; Viewer solo lee.
- **Datos:** `Board`, `Column`, `Task`, **`TaskStatusHistory`** ⚠️ (se escribe en cada movimiento).
- **IA:** AI Sidekick (panel lateral: analiza el tablero, sugiere movimientos, detecta cuellos de botella, responde dudas); AI Insights por tarjeta.
- **Infra:** API NestJS + **WebSocket/realtime (no existe hoy en la infra)** + capa IA (§3).

### M5 · Tareas (detalle, comentarios, adjuntos, actividad)
- **Qué:** vista detalle de tarea, edición de campos, comentarios con menciones, adjuntos, historial de actividad.
- **Quién:** Member+ edita; Viewer lee.
- **Datos:** `Task`, `Comment`, `Attachment`, `ActivityLog`.
- **IA:** sugerencias de optimización por tarea.
- **Infra:** **bucket S3** (`storage/buckets.ts`, hoy vacío) para adjuntos.

### M6 · Planificación de Sprints Inteligente
- **Qué:** crear/iniciar/cerrar sprint, asignar tareas, backlog priorizado, resumen del ciclo activo con fechas y progreso.
- **Quién:** Admin/Member gestionan el sprint.
- **Datos:** `Sprint`, `Task.sprintId`, `Task.estimate` ⚠️.
- **IA:** detección de bloqueos potenciales (p. ej. assets pendientes) y consejos de priorización.
- **Infra:** API NestJS + capa IA.

### M7 · Métricas y Pronósticos
- **Qué:** Burndown, Velocity, métricas por persona, **pronóstico de IA** de fecha de finalización basado en velocidad histórica/actual.
- **Quién:** todos los miembros (Viewer+).
- **Datos (lectura):** `TaskStatusHistory` ⚠️, `Sprint.closedThroughput` ⚠️, `Task.estimate` ⚠️.
- **IA:** modelo predictivo de fecha de fin.
- **Infra:** agregaciones en BD + capa IA. **Depende de que M4/M6 persistan historia desde el inicio.**

### M8 · Gestión de Equipo y Capacidad
- **Qué:** carga de trabajo por miembro (capacidad/evitar burnout), salud del equipo (moral/productividad), sección "Recent Wins".
- **Quién:** Admin/Owner (visión de gestión); miembros ven lo propio.
- **Datos:** `Membership`, `Task` (asignaciones), `ActivityLog`.
- **IA:** análisis de moral/productividad, quién necesita apoyo, quién superó metas.
- **Infra:** agregaciones + capa IA. Transversal a proyectos del workspace.

### M9 · Notificaciones
- **Qué:** notificaciones in-app (asignaciones, menciones, invitaciones, vencimientos) + email para eventos clave (invitación, resumen).
- **Quién:** todos.
- **Datos:** `Notification`.
- **Infra:** in-app (realtime) + **SES** para email; colas para fan-out.

### M10 · Configuración del Proyecto y Automatizaciones
- **Qué:** identidad/branding del workspace, gestión de automatizaciones inteligentes (p. ej. **resumen semanal de sprint** generado por IA).
- **Quién:** Owner/Admin.
- **Datos:** `Workspace`, `Automation`.
- **IA:** generación de resúmenes/automatizaciones.
- **Infra:** **cron/scheduler** + colas (`events/queues.ts`) + capa IA.

### M11 · Búsqueda, Actividad y Auditoría *(transversal)*
- **Qué:** búsqueda/filtrado de tareas y proyectos, feed de actividad, log de auditoría.
- **Datos:** `ActivityLog`, índices de BD.
- **Infra:** consultas/índices Postgres (full-text si hace falta).

---

## 5. Análisis crítico — huecos que faltaba nombrar

| Hueco | Por qué importa | Infra implicada |
|---|---|---|
| **Proyectos como entidad central** | Nunca se listó como módulo, pero todo cuelga de él. | Tablas + API. |
| **RBAC en BD** | Auth0-claims no soporta roles por proyecto. | Migración de modelo de auth. |
| **Realtime / presencia** | Kanban colaborativo y "IA analiza en tiempo real" exigen WebSockets. | **No existe API WebSocket hoy.** |
| **Adjuntos ("assets pendientes")** | Mencionados en sprints; requieren almacenamiento. | `storage/buckets.ts` (vacío) → S3. |
| **Notificaciones + email** | Invitaciones y resúmenes necesitan email. | SES (no configurado). |
| **Colas / jobs async** | Forecast batch, resúmenes, fan-out de notificaciones. | `events/queues.ts` (vacío) → SQS/EventBridge. |
| **Persistencia de historia** ⚠️ | Burndown/velocity/forecast son irreconstruibles a posteriori. | Modelo de Task/Sprint desde el día 1. |
| **Onboarding** | Primer login → crear/unirse a workspace. | Flujo de UI + M1/M3. |
| **Coste/rate-limit de IA** | Sin control, la IA es un riesgo de coste. | `AIInteraction` + capa §3. |

**Fuera de alcance del POC (proponer diferir):** billing/suscripciones, integraciones externas
(Slack/GitHub/webhooks), time tracking, custom fields, múltiples tableros por proyecto, app móvil nativa.

---

## 6. Orden de ejecución (grafo de dependencias, no el orden listado)

Ejecutamos **módulo por módulo** en este orden. La **línea de corte MVP** está marcada.

**Fase 1 · Fundación** → M0 (Auth0, ✅ base) → M1 Workspaces → M2 Proyectos → M3 Invitaciones/Roles.
**Fase 2 · Núcleo** → M4 Kanban + M5 Tareas (con `TaskStatusHistory` desde el inicio ⚠️).
**Fase 3 · Sprints** → M6.
**— ⸻ línea de corte MVP ⸻ —**
**Fase 4 · Inteligencia** → M9 capa IA aplicada + M7 Métricas/Forecast.
**Fase 5 · Equipo y operación** → M8 Equipo + M9 Notificaciones + M10 Automatizaciones + M11 Búsqueda/Auditoría.

Cada fase añade su porción de modelo de dominio, API (NestJS/Lambda), UI (Next.js) e infra (SST).

---

## 7. Decisiones estructurales (confirmadas)

1. **Jerarquía de tenancy:** ✅ `Workspace → Project → {Board, Sprint} → Task`, con membership/roles a nivel workspace y override opcional por proyecto.
2. **RBAC:** ✅ autorización en BD (`membership`/`invitation`); Auth0 queda solo como identidad/login.
3. **Dónde vive la IA:** ✅ integrada en `todo-service` como módulo Nest propio, aislada para poder extraerse a un servicio dedicado más adelante.
