# Spec & Plan — Módulo M4: Tablero Kanban (+ Tareas, historia)

> SDD. Mismo mecanismo que M1/M2/M3. Decisiones del 2026-06-24.
> Estado: **implementado** (código + gates offline `type-check lint build` = 20/20 ✓). Realtime WS / Claude LLM / DnD = runbooks.

---

## Contexto
Fase 2 · Núcleo. Depende de M2 (Project) y M1 (membership/roles, ampliados en M3). M4 es el tablero:
columnas, tarjetas, drag&drop entre columnas, WIP limits, y **`TaskStatusHistory` desde el día 1** ⚠️
(sin esto no hay burndown/cycle-time en M7). Realtime e IA = seams diferidos (infra no presente).

## A. Definición funcional (CERRADA)

### Decisiones (autónomas, alineadas al doc §M4/§2)
1. **Un board por proyecto (MVP).** Se auto-provisiona (board + columnas `To Do`/`Doing`/`Done`) de
   forma perezosa al primer GET del board (`getOrCreateBoard`, transacción).
2. **`TaskStatusHistory` ⚠️ obligatorio:** cada movimiento de columna escribe una fila
   (fromColumnId, toColumnId, byUserId, at) en la MISMA transacción que el update de la tarea.
3. **`estimate` (story points)** se persiste desde el inicio (lo exige velocity/M7).
4. **WIP limit** por columna: se valida en el move (soft → 409 si excede, configurable; MVP: bloquea).
   **Decisión:** WIP se **persiste** y se **expone**; el move lo **respeta** (mover a columna llena → 409).
5. **RBAC:** owner/admin/member **editan** (crear/mover/editar/archivar tarjetas y columnas); **viewer
   lee**. Vía `@WorkspaceRoles('owner','admin','member')` en escritura; lectura para cualquier miembro.
6. **Realtime (WebSocket): DIFERIDO** — runbook (no hay API WS hoy). El web usa server actions +
   `revalidatePath` (consistencia tras cada acción), no push en vivo.
7. **AI Sidekick: seam heurístico, sin LLM aún.** `AiInsightsService` da un análisis **heurístico**
   offline (columnas sobre su WIP, tarjetas sin responsable/estimate, columnas estancadas). La
   integración real con Claude/Anthropic = runbook (usar skill `claude-api`); se aísla en `modules/ai/`.

### Reglas de negocio
| # | Regla |
|---|---|
| BR-1 | Un board por proyecto; columnas ordenadas por `position`; tarjetas ordenadas por `position` dentro de columna. |
| BR-2 | Mover tarjeta = cambia `columnId`/`position` + escribe `TaskStatusHistory` en la misma tx ⚠️. |
| BR-3 | WIP: mover a una columna cuyo nº de tarjetas vivas ≥ `wipLimit` (si está seteado y la tarjeta viene de otra columna) → 409. |
| BR-4 | Escritura (board/column/task): owner/admin/member. Lectura: + viewer. |
| BR-5 | Aislamiento: board/column/task scoped por project→workspace; cross-tenant → 404. |
| BR-6 | Soft-delete de tarjeta (`archivedAt`); archivadas ocultas del board y del conteo WIP. |
| BR-7 | `estimate` ≥ 0 opcional; `priority` ∈ low/medium/high/urgent; `labels` lista de strings; `assigneeId` debe ser miembro del workspace (validado en service). |
| BR-8 | Borrar columna con tarjetas: bloquear (409) o mover a otra; MVP: bloquear si no está vacía. |

## B. Arquitectura

### B.1 Schema (`packages/db/.../schema.ts`, append)
```
boards     id uuid pk · projectId uuid → projects.id (cascade) · name text · createdAt/updatedAt
           uniqueIndex (projectId)   ← un board por proyecto (MVP)
columns    id uuid pk · boardId uuid → boards.id (cascade) · name text · position int notNull
           wipLimit int null · createdAt/updatedAt · idx (boardId)
tasks      id uuid pk · projectId uuid → projects.id (cascade) · boardId uuid → boards.id (cascade)
           columnId uuid → columns.id · title text · description text null
           priority text notNull default 'medium' · assigneeId uuid → users.id null
           estimate int null · position int notNull · labels jsonb notNull default '[]'
           dueDate timestamptz null · sprintId uuid null  ← M6 placeholder (sin FK aún)
           createdBy uuid → users.id · archivedAt timestamptz null · createdAt/updatedAt
           idx (boardId) · idx (columnId) · idx (projectId)
task_status_history ⚠️
           id uuid pk · taskId uuid → tasks.id (cascade) · fromColumnId uuid null · toColumnId uuid notNull
           byUserId uuid → users.id · at timestamptz notNull defaultNow · idx (taskId)
```
Tipos `$inferSelect/$inferInsert` para las 4 tablas. `labels` como `jsonb` (`text("labels").$type<string[]>()`? → usar `jsonb`).

### B.2 Repos
- **`BoardsRepository`**: `getOrCreateBoard(projectId)` (tx: si no existe, crea board + 3 columnas default), `getBoardWithColumns(projectId)`.
- **`ColumnsRepository`**: `create`, `update` (name/wip/position), `delete` (409 si tiene tarjetas vivas), `reorder`.
- **`TasksRepository`**: `create`, `listForBoard` (vivas), `findByIdInBoard`, `update`, `archive`, `move` (tx: relee, valida WIP, update columnId/position, inserta history), `countLiveInColumn`.
- Todo scoped por project/board (que a su vez el service valida pertenece al workspace del guard).
- Barrels (adapter `export *` + top-level named).

### B.3 Tipos (`packages/types/src/schemas/board.ts` nuevo)
`PrioritySchema` (low/medium/high/urgent), `BoardSchema`, `ColumnSchema`, `TaskSchema`,
`BoardWithColumnsSchema` (board + columns[] + tasks[] anidadas o planas), `CreateColumnSchema`,
`UpdateColumnSchema`, `CreateTaskSchema`, `UpdateTaskSchema`, `MoveTaskSchema` ({toColumnId, position}).
Barrel.

### B.4 NestJS (`modules/board/` o separar board/columns/tasks; **MVP: un `BoardModule`** con controller único)
Rutas anidadas bajo `workspaces/:id/projects/:projectId/...` (reusa `WorkspaceMemberGuard` por `:id`;
el service valida project∈workspace y board/column/task∈project):
| METHOD | path | rol |
|---|---|---|
| GET | `.../board` | member+viewer (getOrCreate + columnas + tareas) |
| POST | `.../board/columns` | write |
| PATCH | `.../board/columns/:columnId` | write |
| DELETE | `.../board/columns/:columnId` | write (409 si no vacía) |
| POST | `.../board/tasks` | write |
| PATCH | `.../board/tasks/:taskId` | write |
| POST | `.../board/tasks/:taskId/move` | write (⚠️ history + WIP) |
| DELETE | `.../board/tasks/:taskId` | write (archive) |
| GET | `.../board/insights` | member (IA heurística, seam) |
- `write` = `@WorkspaceRoles('owner','admin','member')`.
- Service: mapea rows→DTO, valida assignee∈workspace, traduce dominio (WIP→409, columna no vacía→409, not found→404).
- `AiInsightsService` en `modules/ai/` (heurístico; runbook para Claude real).
- Wiring: DbModule (3-4 repos), AppModule (BoardModule, AiModule), main.ts tags.

### B.5 Web (`features/board/`)
- `board.api.ts` (reusa `WorkspaceApiError`), `board.actions.ts` (crear/mover/editar/archivar + revalidate).
- `board-view.tsx` (server): columnas en grid horizontal, tarjetas; `create-column-form`, `create-task-form`, `task-card`, `move-task` (form/select de columna destino — sin DnD JS pesado en MVP; mover vía select+submit, DnD = mejora futura). Panel lateral "Sidekick" con insights heurísticos.
- Ruta `app/w/[id]/projects/[projectId]/board/page.tsx` (thin). Enlazar desde `project-detail-view` (tarjeta "Tablero" M4 → activa).
- Candy tokens.

## C. Orden
Fase 1 Datos (4 tablas + repos) → Fase 2 Tipos → Fase 3 API (board/columns/tasks/move/insights) → Fase 4 Web → Fase 5 gates.

## D. Verificación
- `pnpm turbo run type-check lint build` verde.
- Swagger: GET board (auto-crea board+3 columnas), crear columna/tarea, mover (verifica history escrita + WIP 409), viewer no escribe (403), cross-project task → 404, borrar columna no vacía → 409, insights responde.
- DnD real, realtime WS y Claude LLM: runbooks (no offline).

## E. Riesgos
- **History ⚠️:** el move DEBE ser transaccional (update + insert history); en ECS `withTransaction` funciona.
- **WIP en carrera:** contar dentro de la tx tras lock (o aceptar laxitud MVP); MVP cuenta dentro de la tx del move.
- **labels jsonb:** usar `jsonb` de pg-core con `$type<string[]>()`; default `'[]'`.
- **getOrCreateBoard** idempotente: unique (projectId) + onConflictDoNothing o tx con relectura.
- **assignee validation:** requiere lookup de membership; reusar `WorkspacesRepository.findByIdForUser`/listMembers.
