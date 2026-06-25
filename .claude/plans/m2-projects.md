# Spec & Plan — Módulo M2: Proyectos (entidad central)

> Spec-Driven Development. Documento completo: **definición funcional** (PO) + **definición
> técnica/arquitectura** + **orden de ejecución** + **verificación**. Mismo mecanismo que
> [M1 · Workspaces](m1-workspaces.md). Decisiones del 2026-06-24.
>
> **Regla de documentación (permanente):** los planes/definiciones de este proyecto viven en
> `.claude/plans/` **del repo** (project-local), NO en `~/.claude`.
>
> Estado: **aprobado funcional y arquitectónicamente; en ejecución.**

---

## Contexto

CandyProject (ver `docs/DEFINICION-FUNCIONAL.md`) continúa su **Fase 1 · Fundación**. M1
(Workspaces, multi-tenancy + RBAC en BD) ya está mergeado (PR #1). El siguiente módulo del grafo
de dependencias (§6) es **M2 · Proyectos** — la entidad central de la que cuelga todo (boards,
sprints, tasks). La vista de detalle de workspace ya tiene una tarjeta **"Proyectos — Próximamente (M2)"**
([workspace-detail-view.tsx:55-62](../../apps/web/src/features/workspaces/workspace-detail-view.tsx#L55-L62)) lista para activar.

M2 reusa al máximo la infraestructura de M1: el `WorkspaceMemberGuard` (verificado: lee
`req.params.id`, [workspace-member.guard.ts:47](../../apps/services/todo-service/src/modules/workspaces/workspace-member.guard.ts#L47)),
el patrón de repos/tipos/módulo Nest y el patrón web de `features/` + rutas thin.

---

## A. Definición funcional (CERRADA)

### Decisiones PO (confirmadas con el usuario)
1. **Diferir `ProjectMember`.** En M2 NO hay acceso granular por proyecto. Todos los miembros del
   workspace ven todos los proyectos (activos) del workspace; la autorización **reusa membership +
   rol de workspace**. `ProjectMember` + `roleOverride` se añade en una iteración posterior (junto a M3).
   *Esto es un recorte de alcance explícito sobre el doc (que listaba `ProjectMember` y "Member ve los
   que le pertenecen"), siguiendo la filosofía de M1 de diferir invitaciones a M3.*
2. **Solo Owners gestionan.** Workspace Owners crean / editan / archivan proyectos; Members (y Owners)
   leen. Mismo patrón owner-gated que M1 (`@WorkspaceRoles('owner')`).
3. **`key` requerida + única por workspace.** 2–10 caracteres `[A-Z0-9]` (mayúsculas estrictas, sin
   transform), validada por Zod. Lista para la numeración de tareas de M4 (PROJ-123) sin re-migración.

### Decisiones de diseño derivadas
- **`status` ortogonal a `archivedAt`.** `status ∈ {active, paused, completed}` (estado de flujo,
  `text` default `active`); `archivedAt` (soft-delete/visibilidad). `'archived'` **no** es un status.
  El listado filtra solo por `isNull(archivedAt)`; el status nunca oculta proyectos.
- **Unicidad de `key` = índice único parcial** `UNIQUE (workspace_id, key) WHERE archived_at IS NULL`.
  Permite reutilizar la clave de un proyecto archivado. *Seguro solo porque M4 debe numerar tareas por
  `project_id` (inmutable), nunca por el string `key` — anotar en el spec de M4.*
- **Reuso de paleta:** `WORKSPACE_COLOR_PRESETS` (paleta Candy de marca) se comparte; no se duplica.
- **Rutas anidadas:** API bajo `workspaces/:id/projects` (reusa el guard); web `/w/[id]/projects` +
  `/w/[id]/projects/[projectId]` (espeja `/w/[id]/members`).

### Reglas de negocio
| # | Regla |
|---|---|
| BR-1 | Todo proyecto pertenece a exactamente un workspace (`workspaceId` notNull, FK cascade). |
| BR-2 | Solo Owners del workspace crean/editan/archivan proyectos; Members (y Owners) leen. |
| BR-3 | `key` requerida, 2–10 `[A-Z0-9]`, **única entre proyectos vivos** del workspace → duplicado = 409. |
| BR-4 | Clave de un proyecto **archivado** puede reutilizarse (índice parcial). |
| BR-5 | Aislamiento de tenant: un proyecto fuera de su workspace es invisible → **404** (no se filtra existencia). |
| BR-6 | Soft-delete: archivar marca `archivedAt`; archivados ocultos del listado. Detalle por id sigue accesible (espeja M1 `findByIdForUser`). |
| BR-7 | `status` (`active`/`paused`/`completed`) es independiente de la visibilidad (`archivedAt`). |
| BR-8 | Acceso a cualquier ruta de proyectos exige membership del workspace (vía `WorkspaceMemberGuard`). |
| BR-9 | `name` 1–80 chars; `description` opcional (≤500); `color` ∈ preset Candy (validado en escritura). |

### Fuera de alcance de M2 (diferido)
- `ProjectMember` / `roleOverride` (acceso granular por proyecto).
- Board/Column/Task (M4), Sprint (M6) — solo se prepara `Project` como raíz.

---

## B. Definición técnica / arquitectura

### B.1 Schema Drizzle (`packages/db/src/adapters/postgresql/schema.ts`, append; tablas M1 intactas)
Nuevo import: `sql` de `drizzle-orm` (para el `.where()` del índice parcial). `status`/`role` como `text`
(no `pgEnum`; Zod valida).

```
projects
  id uuid pk defaultRandom
  workspaceId uuid notNull → workspaces.id (onDelete cascade)   ← red de seguridad (ws es soft-delete)
  name text notNull · key text notNull · description text null
  status text notNull default 'active'   (active|paused|completed)
  color text notNull
  createdBy uuid notNull → users.id      (sin onDelete, espeja workspaces.createdBy)
  archivedAt timestamptz null (soft-delete) · createdAt/updatedAt timestamptz notNull defaultNow
  uniqueIndex parcial projects_ws_key_unique (workspaceId, key) WHERE archived_at IS NULL  ← BR-3/BR-4
  idx projects_ws_idx (workspaceId)      ← listForWorkspace
```
Export `$inferSelect`/`$inferInsert` → `ProjectRow`/`NewProjectRow`.

**Verificar tras generar:** abrir `packages/db/migrations/0002_*.sql` y confirmar que emite el
`WHERE "archived_at" is null` en el CREATE UNIQUE INDEX. Si falta el WHERE, corregir el `.where()` del
schema y **regenerar** (nunca editar el `.sql` a mano).

### B.2 `ProjectsRepository` (`packages/db/.../projects.repository.ts`, NUEVO)
Clase plana `constructor(private readonly db: PostgresClient) {}`. **Sin transacciones** (a diferencia
de M1: aquí se escribe UNA tabla; la unicidad de `key` es atómica vía índice → 23505 → 409). Todo
método scoped por `workspaceId` (tenant isolation).

| Método | Firma | Notas |
|---|---|---|
| `create` | `(input: CreateProjectInput): Promise<ProjectRow>` | `insert(...).returning()`. Dup live key → 23505 → 409 (filtro global). |
| `listForWorkspace` | `(workspaceId): Promise<ProjectRow[]>` | `and(eq(workspaceId), isNull(archivedAt))`, `orderBy(desc(createdAt))`. |
| `findByIdInWorkspace` | `(workspaceId, projectId): Promise<ProjectRow \| null>` | Scoped por AMBOS ids → cross-workspace invisible. NO filtra `archivedAt` (detalle accesible, espeja M1). |
| `update` | `(workspaceId, projectId, patch): Promise<ProjectRow \| undefined>` | `set` solo de campos definidos + `updatedAt`. Cambio de `key` → posible 409. `undefined` ⇒ service 404. |
| `archive` | `(workspaceId, projectId): Promise<ProjectRow \| undefined>` | `set({ archivedAt: now, updatedAt: now })`. |

**Barrels (3 archivos, 2 estilos):**
1. `adapters/postgresql/index.ts` → `export * from "./projects.repository";` (1 línea).
2. `packages/db/src/index.ts` → **named exports EXPLÍCITOS** (el que más se olvida): añadir
   `ProjectsRepository` al `export {…}` y `ProjectRow, NewProjectRow, ProjectStatus, CreateProjectInput,
   UpdateProjectPatch` al `export type {…}`.
3. (types) `packages/types/src/index.ts` → `export * from "./schemas/project";` (ver B.4).

### B.3 RBAC — reuso de `WorkspaceMemberGuard`, **sin guard nuevo** (verificado)
- Controller con prefijo **`@Controller("workspaces/:id/projects")`** — `:id` sigue siendo el WORKSPACE
  (el guard hardcodea `req.params.id`). El id del proyecto DEBE llamarse **`:projectId`**.
- `@UseGuards(Auth0Guard, WorkspaceMemberGuard)` a **nivel clase** (toda ruta es workspace-scoped).
  `@WorkspaceRoles("owner")` por método sigue funcionando (el guard lee `getAllAndOverride`).
- "Proyecto pertenece al workspace" NO es trabajo del guard: cada método del repo scopea
  `(projectId, workspaceId)` → null → service `NotFoundException` → 404.
- **Gotcha de wiring:** `WorkspaceMemberGuard` es provider de `WorkspacesModule` y NO se exporta →
  `ProjectsModule` debe registrarlo en su propio `providers`. El guard + `WORKSPACE_ROLES_KEY`/
  `@WorkspaceRoles` se importan cross-folder desde `../workspaces/` (cero churn en M1; relocalizar a
  `modules/shared/` queda como refactor futuro).

### B.4 Tipos (`packages/types/src/schemas/project.ts`, NUEVO; template = `workspace.ts`)
`ProjectStatusSchema` (`z.enum(['active','paused','completed'])`), `ProjectKeySchema`
(`/^[A-Z0-9]{2,10}$/`, estricto sin transform), `ProjectNameSchema` (1–80), `ProjectColorSchema`
(`z.enum(WORKSPACE_COLOR_PRESETS)`, reuso), `ProjectDescriptionSchema` (≤500), `ProjectSchema` (fechas
`z.string().datetime()`, reads tolerantes), `CreateProjectSchema` (name/key/description?/color/status?),
`UpdateProjectSchema` (`.partial().refine` ≥1 campo, `description` nullable para limpiar). Tipos vía
`z.infer`. Re-export desde `packages/types/src/index.ts`.

### B.5 Módulo NestJS (`apps/services/todo-service/src/modules/projects/`, NUEVO)
Archivos: `projects.{module,controller,service,dto}.ts`. `.dto.ts` solo re-exporta de `types`. Sin
guard/decorator nuevos.

| METHOD path (tras `/api`) | rol | acción |
|---|---|---|
| POST `/workspaces/:id/projects` | owner | `create(req.params.id, req.user.id, body)` |
| GET `/workspaces/:id/projects` | member | `listForWorkspace` (sin archivados) |
| GET `/workspaces/:id/projects/:projectId` | member | detalle (404 si no pertenece) |
| PATCH `/workspaces/:id/projects/:projectId` | owner | update (key dup → 409) |
| DELETE `/workspaces/:id/projects/:projectId` | owner | archive (soft-delete) |

- Clase: `@ApiTags("projects")`, `@ApiBearerAuth()`, `@Controller("workspaces/:id/projects")`,
  `@UseGuards(Auth0Guard, WorkspaceMemberGuard)`. Owner-only routes: `@WorkspaceRoles("owner")`.
- `:projectId` con `@Param("projectId", ParseUUIDPipe)` (**ya es el patrón M1**: `userId` usa
  `ParseUUIDPipe` en [workspaces.controller.ts:165,182](../../apps/services/todo-service/src/modules/workspaces/workspaces.controller.ts#L165)). `:id` plano (lo valida el guard).
- Body: `CreateProjectSchema.parse(body)` / `UpdateProjectSchema.parse(body)` (ZodError → 400 vía
  `AllExceptionsFilter`). Swagger: `@ApiConflictResponse` en POST/PATCH (key duplicada), `PROJECT_EXAMPLE`.
- Service: `@Inject(ProjectsRepository)`, mapea rows→DTO (`toProject`, `Date.toISOString()`), `undefined`/
  `null` del repo → `NotFoundException`. Sin `translateDomainError` (no hay errores de dominio en M2).
- Wiring: `db.module.ts` (provider `ProjectsRepository` vía `useFactory` + export), `app.module.ts`
  (import `ProjectsModule`), `main.ts` (`.addTag("projects", …)`). `ProjectsModule` importa
  `DbModule` + `AuthModule`; providers `[ProjectsService, WorkspaceMemberGuard]`.

### B.6 Web (`apps/web`, full-stack)
- `features/projects/projects.api.ts` (`"server-only"`): patrón `apiFetch` de M1 (Bearer de
  `auth0.getAccessToken()`, `cache:"no-store"`). **Reusar `WorkspaceApiError`** (un solo tipo de error
  web; las rutas ya ramifican por `.status===404`). Funciones: list/get/create/update/archive (todas con `workspaceId`).
- `projects.actions.ts` (`"use server"`): `ActionState {error?}`, validación Zod, `revalidatePath`/
  `redirect`, `.bind(null, workspaceId)` para `useActionState`.
- Vistas Candy: `projects-view.tsx` (grid + empty-state + create form owner-only), `project-detail-view.tsx`
  (header con key/status/color, edit/archive owner-only), `create-project-form.tsx` (`"use client"` +
  `useActionState`: name, key `pattern="[A-Z0-9]{2,10}"`, description, color picker reusando presets,
  status select), opcional `edit-project-form.tsx`/`project-card.tsx`.
- Rutas thin: `app/w/[id]/projects/page.tsx` (gate Auth0 + `getWorkspace(id)` para flag owner +
  `listProjects(id)` → view; 404 → `notFound()`), `app/w/[id]/projects/[projectId]/page.tsx`
  (`params: Promise<{id, projectId}>` → `getProject` → 404 → view).
- **Cablear la tarjeta existente:** reemplazar el `<div>…Próximamente (M2)…</div>` de
  [workspace-detail-view.tsx:55-62](../../apps/web/src/features/workspaces/workspace-detail-view.tsx#L55-L62)
  por un `<Link href={\`/w/${workspace.id}/projects\`}>` con el estilo de la tarjeta Miembros (41-53).

---

## C. Orden de ejecución (full-stack)

**Fase 0 — Documentación:** este spec en `<repo>/.claude/plans/m2-projects.md` (regla project-local; espeja M1).

**Fase 1 — Datos:** schema (`projects` + import `sql`) → `pnpm --filter @todo-list-poc-infra/db db:generate`
→ inspeccionar `migrations/0002_*.sql` (WHERE parcial presente) → `projects.repository.ts` → 3 barrels.
**Fase 2 — Tipos:** `schemas/project.ts` + barrel.
**Fase 3 — API NestJS:** dto → service → controller → module → wiring (db.module, app.module, main.ts swagger). Verificar vía Swagger.
**Fase 4 — Web:** `features/projects/` + rutas + cablear tarjeta nav.
**Fase 5 — Verificación end-to-end.**

Validación continua: `pnpm turbo run type-check lint build`.

---

## D. Verificación
- **Type/build:** `pnpm turbo run type-check lint build` (db, types, todo-service, web en verde).
- **Migración:** auto en deploy (`infra/src/databases/migrate.ts`, hash-triggered); local
  `pnpm --filter @todo-list-poc-infra/db db:migrate` contra la rama Neon del stage.
- **Backend (Swagger `/api/docs`)** — matriz crítica:

| Caso | Esperado |
|---|---|
| Owner POST proyecto válido | 201 |
| POST key duplicada (proyecto activo, mismo ws) | 409 |
| POST misma key que un proyecto ARCHIVADO | 201 (índice parcial permite reuso) |
| Member POST/PATCH/DELETE | 403 |
| Member GET list/detalle | 200 |
| No-miembro cualquier ruta | 404 (no filtra existencia) |
| GET/PATCH proyecto de OTRO workspace (id válido, `:id` distinto) | 404 |
| GET list | excluye archivados |
| PATCH cambiando key a duplicada viva | 409 |
| Body inválido (key mal, patch vacío) | 400 (ZodError) |
| `:projectId` malformado | 400 (ParseUUIDPipe) |

- **Web e2e (`:3000`):** login → `/workspaces` → entrar a `/w/[id]` → tarjeta **Proyectos** activa →
  `/w/[id]/projects` (empty-state, crear con picker color + key + status) → detalle `/w/[id]/projects/[projectId]`
  → editar/archivar (controles solo owner). 401 en la 1ª llamada = audience mal; 403/404 = guard OK.

### Archivos críticos
- `packages/db/src/adapters/postgresql/schema.ts` · `projects.repository.ts` (NUEVO) · barrels (`adapters/postgresql/index.ts`, `src/index.ts`)
- `packages/types/src/schemas/project.ts` (NUEVO) · `index.ts`
- `apps/services/todo-service/src/modules/projects/*` (NUEVO) · `db/db.module.ts` · `app.module.ts` · `main.ts`
- `apps/web/src/features/projects/*` (NUEVO) · `app/w/[id]/projects/*` (rutas) · `features/workspaces/workspace-detail-view.tsx` (cablear tarjeta)

---

## E. Riesgos / edge cases
- **Carrera de unicidad de key:** dos POST simultáneos con la misma key → el índice parcial serializa
  en BD → el perdedor recibe 23505 → 409. Por eso NO se hace read-then-insert ni lock (a diferencia de BR-5 de M1).
- **`status` vs `archivedAt`:** ortogonales por diseño; `'archived'` no es status; un proyecto archivado
  conserva su status (p.ej. `completed`) pero se oculta por `isNull(archivedAt)`.
- **Workspace archivado:** el guard (M1) NO filtra `archivedAt` en `findByIdForUser` → un miembro entra a
  un workspace archivado y sus proyectos siguen accesibles. Se mantiene el comportamiento M1; no divergir.
- **Cascade:** `workspaceId → onDelete cascade` es red de seguridad (los workspaces son soft-delete; el
  cascade no dispara en flujo normal). `createdBy` sin onDelete.
- **Dependencia M4 (anotar en su spec):** la numeración de tareas DEBE referenciar `project_id` (inmutable),
  nunca el string `key` — si no, el reuso de key (BR-4) sería un bug latente.
