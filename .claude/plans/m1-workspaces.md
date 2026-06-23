# Spec & Plan — Módulo M1: Workspaces (Fundación multi-tenancy)

> Spec-Driven Development. Documento completo: **definición funcional** (PO) + **definición
> técnica/arquitectura** + **orden de ejecución** + **verificación**. Decisiones del 2026-06-23.
>
> **Regla de documentación (permanente):** los planes/definiciones de este proyecto viven aquí,
> en `.claude/plans/` del repo (project-local), no en `~/.claude`.
>
> Estado: **aprobado funcionalmente y en arquitectura; pendiente lectura/revisión del usuario antes de implementar.**

---

## Contexto

CandyProject (ver `docs/DEFINICION-FUNCIONAL.md`) arranca su **Fase 1 · Fundación**. M1 es la
base de multi-tenancy sobre la que cuelgan Proyectos, Tableros y todo lo demás. Decisiones ya
fijadas en la definición funcional (§7): jerarquía `Workspace → Project → {Board, Sprint} → Task`;
**RBAC con respaldo en BD**; Auth0 solo identidad.

Estado base del repo (confirmado por exploración):
- Única tabla `users`. RBAC hoy 100% claims de Auth0 (`RolesGuard` lee `session.roles` del JWT, global).
- DB: Drizzle schema + Repository class (`packages/db`), migraciones drizzle-kit auto en deploy (`infra/src/databases/migrate.ts`, hash-triggered).
- Auth: `authorizeRequest()` framework-agnóstico → `Auth0Guard` (NestJS) hace lazy-upsert, setea `req.user` (Zod User) + `req.session`.
- NestJS: módulo por feature, Zod en `packages/types`, repos en `packages/db` vía `DbModule` (`useFactory`).
- Transacciones: `withTransaction(db, fn)` funciona en ECS (`pg` pool); LANZA en Lambda (Neon HTTP). `todo-service` corre en ECS → OK.

---

## A. Definición funcional (CERRADA)

### Decisiones (3 rondas PO)
1. **Alcance:** Workspaces + Roles/Membership en BD. Invitaciones por email → M3.
2. **Creación:** self-serve; el creador queda Owner.
3. **Onboarding:** estado vacío → "crea tu primer workspace".
4. **Roles:** `owner` / `member` (2 niveles). Multi-owner permitido.
5. **Añadir miembros:** Owner agrega usuarios YA registrados por email, directo como `member`.
6. **Campos:** nombre + branding (color preset Candy + ícono emoji).
7. **Borrado:** soft-delete (`archivedAt`).
8. **Owner:** múltiples Owners; cualquiera gestiona todo.
9. **Último Owner:** invariante "siempre ≥1 Owner".
10. **Gestión:** solo Owners gestionan miembros/roles/ajustes.
11. **Branding:** color de preset Candy + emoji (sin subida de imágenes).
12. **Add-by-email a no-usuario:** error "debe registrarse primero" (invitar a no-usuarios → M3).

**Defaults:** nombre no único (1–80 chars), id UUID, sin slug; sin límite de workspaces por usuario;
workspace activo client-side (`/w/<id>/...`); auto-removerse = "salir"; re-agregar permitido.

### Reglas de negocio
| # | Regla |
|---|---|
| BR-1 | Cualquier usuario autenticado crea workspaces (self-serve) → Owner. |
| BR-2 | Crear workspace es **atómico** (workspace + membership Owner en una transacción). |
| BR-3 | Roles `owner`/`member`; multi-owner. |
| BR-4 | Solo Owners gestionan miembros, roles, branding y archivar. |
| BR-5 | **Siempre ≥1 Owner**: bloquear salir/degradar/remover si dejaría 0 Owners. |
| BR-6 | Add member = buscar usuario registrado por email → membership `member`. Email no registrado → error. |
| BR-7 | Member puede salir solo (si no rompe BR-5). |
| BR-8 | Soft-delete: archivar marca `archivedAt`; archivados ocultos del listado. Solo Owner. |
| BR-9 | Branding: `color` ∈ preset Candy, `icon` = emoji (validado Zod). |
| BR-10 | Aislamiento de tenant: solo se ven/accede workspaces con membership propia. |
| BR-11 | Onboarding: sin memberships → estado vacío. |

---

## B. Definición técnica / arquitectura

### B.0 Riesgos clave (verificados en código)
1. **Auth0 audience (CRÍTICO, verificado):** `apps/web/src/lib/auth0.ts` es `new Auth0Client()` sin
   `authorizationParams` → `getAccessToken()` no emite token con `aud` = API → el `todo-service`
   responde 401 a TODA llamada. **Fix:** `new Auth0Client({ authorizationParams: { audience: process.env.AUTH0_AUDIENCE, scope: "openid profile email offline_access" } })`. `AUTH0_AUDIENCE` ya
   se inyecta al web (`infra/src/webs/web.ts:34`) y al servicio (`infra/src/services/workers.ts:54`) — mismo valor → el token validará.
   - **Valor decidido (quemado por ahora):** `AUTH0_AUDIENCE=https://api.todo.com` — identificador *lógico* de la API (no es un endpoint, no se invoca; es la "identidad" de la API en Auth0). Mismo valor en local y en AWS; lo que cambia por ambiente es la URL destino (`NEXT_PUBLIC_API_URL`). Se fija como default en `.env.example` y como fallback. Auth sigue inerte (`isAuth0Configured=false`) hasta que se configure el tenant Auth0 real; ese día se registra este mismo string como Identifier de la API.
2. **Invariante último-Owner = carrera, no conteo:** el `count(owners)>=2` leído-luego-mutado permite
   que dos "salir" simultáneos vean 2 y ambos procedan → 0 owners. El conteo va DENTRO de la misma
   `withTransaction` que la mutación, con `SELECT ... role='owner' ... FOR UPDATE` (lock de filas).
3. **`email` NO es único en `users`** (`users_email_idx` es index normal, y `lazyUpsert` keya en `auth0_user_id`).
   `findByEmail` debe ordenar determinísticamente (`orderBy createdAt asc`, `limit 1`) y documentarlo.
4. **404 vs 403:** sin membership → **404** (no filtrar existencia). Member en ruta owner-only → **403**.

### B.1 Schema Drizzle (`packages/db/src/adapters/postgresql/schema.ts`, append; `users` intacto)
`role` como `text` (no `pgEnum` — evita `ALTER TYPE` doloroso; Zod valida).

```
workspaces
  id uuid pk defaultRandom · name text · color text · icon text
  createdBy uuid notNull → users.id · archivedAt timestamptz null (soft-delete)
  createdAt/updatedAt timestamptz notNull defaultNow
  idx: workspaces_created_by_idx (createdBy)

workspace_memberships
  id uuid pk · workspaceId uuid → workspaces.id (onDelete cascade) · userId uuid → users.id
  role text notNull ('owner'|'member') · createdAt timestamptz notNull defaultNow
  uniqueIndex (workspaceId, userId)  ← duplicado → 23505 → 409
  idx (userId)  ·  idx (workspaceId)
```
Export `$inferSelect`/`$inferInsert` para ambas (`WorkspaceRow`/`NewWorkspaceRow`/`WorkspaceMembershipRow`/`NewWorkspaceMembershipRow`).

### B.2 Repositorios (`packages/db`)
**`WorkspacesRepository`** (nuevo, maneja workspace + membership porque la atomicidad y el invariante cruzan ambas tablas):
- `createWithOwner(input)` → `withTransaction`: insert workspace + insert membership owner.
- `listForUser(userId)` → join membership (excluye `archivedAt`), adjunta `role`.
- `findByIdForUser(workspaceId, userId)` → `WorkspaceWithRole | null` (usado por guard y GET /:id).
- `updateBranding`, `archive` (set `archivedAt`).
- `listMembers(workspaceId)` → join `users` (email/name/picture).
- `addMemberByUserId(workspaceId, userId, 'member')`.
- `removeMember` / `changeRole` / `leave` → **todas en `withTransaction` + `FOR UPDATE`** con guarda BR-5.
- helper privado `countOwnersForUpdate(tx, workspaceId)`.

**`UsersRepository.findByEmail(email)`** (NUEVO — hoy no existe): `orderBy createdAt asc, limit 1`; comentar no-unicidad.

Barrel: exportar repo + tipos desde `adapters/postgresql/index.ts` y `packages/db/src/index.ts`.

### B.3 RBAC por workspace (NestJS, DB-backed) — vive en `modules/workspaces/`
Un solo guard, una sola consulta:
- `workspace-roles.decorator.ts`: `@WorkspaceRoles('owner')` (SetMetadata).
- `workspace-member.guard.ts`: `WorkspaceMemberGuard` — lee `req.user.id` (lo puso `Auth0Guard` class-level) + `req.params.id`; `findByIdForUser` → null ⇒ **404**; adjunta `req.membership` (incl. workspace cargado); si `@WorkspaceRoles` y el rol no coincide ⇒ **403**.
- Composición: controller `@UseGuards(Auth0Guard)` a nivel clase (corre primero), `@UseGuards(WorkspaceMemberGuard)` por ruta. NO re-aplicar `Auth0Guard` por método (doble upsert). El handler reusa `req.membership.workspace` (sin re-query).
- El guard se provee en `WorkspacesModule` (necesita `WorkspacesRepository` de `DbModule`). No va en `src/auth/` (esos guards no tienen deps de repo).

### B.4 Tipos (`packages/types/src/schemas/workspace.ts`, template = `user.ts`)
`WorkspaceRoleSchema` (`z.enum(['owner','member'])`), `WorkspaceSchema`, `WorkspaceWithRoleSchema` (+`role`),
`CreateWorkspaceSchema` (pick name/color/icon), `UpdateWorkspaceBrandingSchema` (partial + refine ≥1 campo),
`AddMemberSchema` (`{email}`), `ChangeRoleSchema` (`{role}`), `WorkspaceMemberSchema` (joined user).
Re-export desde `packages/types/src/index.ts`. (Opcional: `color` como `z.enum([...presetsCandy])`.)

### B.5 Módulo NestJS (`apps/services/todo-service/src/modules/workspaces/`)
`workspaces.{module,controller,service,dto}.ts` + guard + decorator. `.dto.ts` solo re-exporta de `types`.
Controller `@Controller("workspaces")`, class-level `@UseGuards(Auth0Guard)` + `@ApiBearerAuth()`, body `safeParse`→`BadRequestException`.

| METHOD path | guard(s) | rol | acción |
|---|---|---|---|
| POST `/workspaces` | Auth0 | authed | createWithOwner(req.user.id, body) |
| GET `/workspaces` | Auth0 | authed | listForUser (sin archivados) |
| GET `/workspaces/:id` | +Member | member | detalle (reusa req.membership) |
| PATCH `/workspaces/:id` | +Member `@WorkspaceRoles('owner')` | owner | updateBranding |
| DELETE `/workspaces/:id` | +Member owner | owner | archive |
| GET `/workspaces/:id/members` | +Member | member | listMembers |
| POST `/workspaces/:id/members` | +Member owner | owner | addMember(email) |
| PATCH `/workspaces/:id/members/:userId/role` | +Member owner | owner | changeRole (BR-5) |
| DELETE `/workspaces/:id/members/:userId` | +Member owner | owner | removeMember (BR-5) |
| POST `/workspaces/:id/leave` | +Member | member | leave (BR-5) |

Param del workspace siempre `:id`. Service mapea rows→DTO (nunca rows crudas), traduce errores de dominio (último-owner → `ConflictException`; email no encontrado → `NotFoundException`; duplicado → 409 vía filtro).
Wiring: `DbModule` provee `WorkspacesRepository`; `AppModule` importa `WorkspacesModule`; tag Swagger en `main.ts`.

### B.6 Web (`apps/web`, full-stack en esta tanda)
- **Fix audience** en `lib/auth0.ts` (B.0 #1).
- `features/workspaces/workspaces.api.ts` (server-only): `apiFetch` con `auth0.getAccessToken()` → `Bearer` a `${NEXT_PUBLIC_API_URL}/api/...`, `cache:no-store`. Funciones: list/create/get/updateBranding/archive/listMembers/addMember/changeRole/removeMember/leave.
- `workspace-actions.ts` (`"use server"`): acciones que llaman api + `revalidatePath`/`redirect`.
- Vistas Candy (tokens de `globals.css`): `empty-state.tsx` (onboarding), `create-workspace-form.tsx` (nombre + picker color preset Candy + emoji), `workspace-list.tsx`/`workspace-switcher.tsx`, `members-view.tsx`+`add-member-form.tsx`+`member-row.tsx` (controles owner-only).
- Rutas thin: `app/workspaces/page.tsx` (gate Auth0 como `dashboard/page.tsx` + empty-state/list), `app/w/[id]/page.tsx`, `app/w/[id]/members/page.tsx`. El backend 403/404 es la autoridad real.

---

## C. Orden de ejecución (full-stack + tests)

**Fase 0 — Documentación (HECHA):** este spec en `.claude/plans/m1-workspaces.md` + regla project-local. **Pausa para revisión del usuario.**

**Fase 1 — Datos:** schema (2 tablas) + `db:generate` (migración) + `WorkspacesRepository` + `UsersRepository.findByEmail` + barrels. Test vitest (incl. concurrencia BR-5).
**Fase 2 — Tipos:** `schemas/workspace.ts` + barrel.
**Fase 3 — API NestJS:** módulo workspaces (controller/service/dto/guard/decorator), DbModule, AppModule, Swagger. Verificar vía Swagger.
**Fase 4 — Web:** fix audience + `features/workspaces/` + rutas. Vistas Candy.
**Fase 5 — Verificación end-to-end.**

Validación continua: `pnpm turbo run type-check lint build`.

---

## D. Verificación
- **Type/build:** `pnpm turbo run type-check`, `lint`, `build` (db, types, todo-service, web).
- **Test:** `workspaces.repository.test.ts` (vitest) — caso crítico: dos `leave`/`demote` de owner en paralelo NO pueden dejar 0 owners; add-by-email (no existe→404, duplicado→409).
- **Backend (Swagger):** todo-service `:3001`, `/api/docs`. Token Auth0 (aud=API). Probar: crear (creador=owner), listar (archivados ocultos, rol adjunto), add por email (desconocido→404, dup→409), último-owner leave/demote→bloqueado, no-member GET/:id→404, member PATCH→403.
- **Web e2e:** `:3000`. Sin secrets → path graceful `isAuth0Configured=false`. Con secrets+audience → login, `/workspaces` empty-state, crear, switcher, `/w/[id]/members`. Primera llamada web→API valida el fix de audience (401 aquí = audience mal; 403/404 = guard OK).

### Archivos críticos
- `packages/db/src/adapters/postgresql/schema.ts` · `workspaces.repository.ts` (nuevo) · `users.repository.ts` (findByEmail) · barrels
- `packages/types/src/schemas/workspace.ts` (nuevo) · `index.ts`
- `apps/services/todo-service/src/modules/workspaces/*` (nuevo) · `db/db.module.ts` · `app.module.ts` · `main.ts`
- `apps/web/src/lib/auth0.ts` (audience) · `apps/web/src/features/workspaces/*` (nuevo) · `app/workspaces`, `app/w/[id]` rutas

---

## F. Runbook Fase 5 — verificación end-to-end (SST + Neon, NO Docker)

> Estado al cierre de Fase 4: **Fases 1–4 completas**, todas las puertas offline en verde
> (`turbo run type-check lint build` = 20 tasks ✓; tests db 6 / types 10 / core 6 ✓; boot del
> servicio con 10 rutas mapeadas y orden de guards 401 ✓). Lo que falta es runtime real.
>
> **El proyecto NO usa Docker para la DB.** El entorno real se levanta con `sst dev` (Neon +
> ECS + API Gateway + web). La migración `0001` se aplica **sola** (`infra/src/databases/migrate.ts`,
> hash-triggered).

### F.0 Prerequisito Auth0 (el que más muerde)
El `Auth0Guard` exige `email` en custom claims bajo `AUTH0_NAMESPACE` (default
`https://app.example.com/`). El **access token** de Auth0 no trae `email`/`profile` por defecto:
hace falta una **Auth0 Action (Login flow)** que añada `https://app.example.com/email` (y
`https://app.example.com/roles` si se usan). Sin ella → `401 "JWT missing email claim"` aunque
todo lo demás esté bien. `aud` sí valida solo (mismo `AUTH0_AUDIENCE` en web y servicio).

`.env` raíz (ya tiene las claves, faltan valores reales):
`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (`openssl rand -hex 32`),
`AUTH0_AUDIENCE=https://api.todo.com`, `APP_BASE_URL=http://localhost:3000`. En el tenant: registrar
`http://localhost:3000/auth/callback` como Allowed Callback URL.

### F.1 Levantar entorno
```bash
sst dev --stage <tu-nombre>     # provisiona Neon, corre servicio + API + web; aplica migración 0001
```

### F.2 Backend (Swagger `/api/docs`) — casos críticos
Necesita un Bearer token con `aud=https://api.todo.com` (del flujo de login, ver F.0).

| Caso | Esperado |
|---|---|
| `POST /api/workspaces` | 201; el creador queda `owner` |
| `GET /api/workspaces` | lista activos, con `role`; archivados ocultos |
| `GET /api/workspaces/:id` (no-miembro) | **404** (no filtra existencia) |
| `PATCH /api/workspaces/:id` (member) | **403** |
| `POST /api/workspaces/:id/members` email no registrado | **404** "debe registrarse primero" |
| `POST /api/workspaces/:id/members` email duplicado | **409** |
| `DELETE …/members/:userId` del último owner | **409** (BR-5) |
| `PATCH …/members/:userId/role` degradando al último owner | **409** (BR-5) |
| `POST /api/workspaces/:id/leave` siendo el último owner | **409** (BR-5) |

### F.3 Web e2e (`http://localhost:3000`)
Login → `/workspaces` (empty-state si no hay membresías) → crear (picker color preset + emoji) →
entrar a `/w/[id]` → `/w/[id]/members` (agregar por email, cambiar rol, remover; controles solo
para owner). La **primera** llamada web→API valida el fix de audience: 401 aquí = audience mal;
403/404 = guard OK (audience bien).

### F.4 Test de integración BR-5 (concurrencia `FOR UPDATE`) — DIFERIDO
Es el único test que faltó por necesitar Postgres vivo. Con el `DATABASE_URL` que expone `sst dev`
(la rama Neon del stage), se puede correr un vitest que: inserta 2 users + 1 workspace + 2 owners,
dispara 2 `leave` en paralelo y verifica que **exactamente uno** falla con `LastOwnerError` (el lock
serializa). Pendiente de escribir; debe ser opt-in (`RUN_DB_IT=1`) y auto-limpiar sus filas para no
ensuciar la rama compartida.
