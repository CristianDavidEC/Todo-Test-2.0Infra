# Configuración Neon

> Pasos para configurar Neon (Postgres serverless) como BD de la plantilla. Hazlo **una vez por organización** al iniciar el proyecto base; luego se hace una vez más al clonar la plantilla para un nuevo proyecto.

## Estrategia de proyectos Neon

La plantilla usa una estrategia **híbrida** (ver también [07-infraestructura-sst.md](./07-infraestructura-sst.md)):

| Stage | Proyecto Neon | Branch | Razón |
|---|---|---|---|
| `prod` | `base-apps-prod` (propio) | `main` | Aislamiento total de prod |
| `staging` | `base-apps-staging` (propio) | `main` | Aislamiento; prod-like |
| `dev` | `base-apps-dev` (compartido) | `main` (seed canónico) | Base para branches personales |
| `<personal>` (ej: `cristian`) | `base-apps-dev` (mismo) | `cristian` (forked de main) | Copy-on-write; data shared |
| `pr-<n>` (efímero) | `base-apps-dev` (mismo) | `pr-<n>` (forked de main) | Preview por PR |

**Total proyectos Neon: 3** (prod, staging, dev) — cabe en free tier (10 proyectos).

---

## 1. Crear organización en Neon

```
https://console.neon.tech/signup
```

Crea una cuenta (o usa GitHub OAuth). Tras login, llegarás a tu **personal organization**. Para el proyecto base de la empresa, recomiendo crear una **organization separada**:

1. En el sidebar izquierdo → click en el avatar/nombre arriba → **Create Organization**
2. Nombre sugerido: `<nombre-empresa>` (ej: `Empresa SA`)
3. Confirma la creación

---

## 2. Obtener `NEON_ORG_ID`

1. Ve a la organización recién creada
2. **Settings** (sidebar) → **General**
3. Copia el **Organization ID** (formato `org-xxxxxxxxxxxxxxxx`)

Guárdalo. Lo vas a usar en `.env`.

---

## 3. Generar `NEON_API_KEY`

1. En la org → **Settings** → **API keys**
2. Click **Generate new API key**
3. Type: **Organization-scoped** (permite gestionar todos los proyectos)
4. Nombre: `sst-base-apps` (identifica el uso)
5. Click **Create**
6. **COPIA EL VALOR INMEDIATAMENTE** — Neon no lo muestra de nuevo
7. Formato: `napi_xxxxxxxxxxxxxxxxxxxxxxxxx`

Guárdalo. Es un secret personal — NO se commitea al repo.

---

## 4. Configurar `.env` local

En la raíz del repo:

```bash
cp .env.example .env
```

Edita `.env`:

```bash
# Neon
NEON_API_KEY="napi_xxxxxxxxxxxxxxxxxxxxxxxxx"     # tu API key personal
NEON_ORG_ID="org-xxxxxxxxxxxxxxxx"                # ID de la org

# Después del primer deploy de 'dev', llenar:
NEON_DEV_PROJECT_ID=""                            # se obtiene tras `sst deploy --stage dev`
```

> **Nota:** `NEON_API_KEY` es personal por dev. `NEON_ORG_ID` y `NEON_DEV_PROJECT_ID` son compartidos por todo el equipo y van committed en `.env.example` (no son secrets).

---

## 5. Provider Neon en SST (ya viene cableado)

**La plantilla ya trae el provider Neon configurado** en `sst.config.ts`
(`providers.neon: "0.13.0"`), así que `neon.*` está disponible en `infra/` desde el
primer clon. **No necesitas correr `sst add neon`** — solo asegúrate de tener
`NEON_API_KEY` y `NEON_ORG_ID` en tu `.env` (pasos 3-4).

> Para referencia: ese provider se añadió originalmente con `pnpm sst add neon` (instala el
> provider Pulumi de Neon y escribe la entrada `providers.neon` en `sst.config.ts`). Solo
> tendrías que volver a correrlo si quitas esa línea o quieres cambiar la versión del provider.

---

## 6. Primer deploy: crear proyectos `dev`, `staging`, `prod`

El orden importa. Las personal stages dependen del proyecto `dev`, así que se deploya `dev` primero.

### 6.1. Deploy `dev` shared

```bash
pnpm sst deploy --stage dev
```

Esto crea el proyecto Neon `base-apps-dev` con su branch `main`.

**Captura del output del deploy** (o de la consola) tanto `NEON_DEV_PROJECT_ID` como
`SHARED_DEV_VPC_ID`. Ambos son necesarios **antes** del primer `sst dev` personal:
`neon.ts` y `networking/vpc.ts` lanzan error si faltan en stages personales.

- `NEON_DEV_PROJECT_ID`: del output, o Neon console → Settings → General del proyecto `base-apps-dev`.
- `SHARED_DEV_VPC_ID`: del output, o AWS console → VPC dashboard (la VPC `base-apps-dev-vpc`).

Actualiza `.env.example` (committed):

```bash
NEON_DEV_PROJECT_ID="proj-xxxxxxxxxxxxxxxx"   # ← agregar aquí
SHARED_DEV_VPC_ID="vpc-xxxxxxxxxxxxxxxx"      # ← agregar aquí (lo usan las personal stages)
```

Y haz commit + push:

```bash
git add .env.example
git commit -m "chore: set NEON_DEV_PROJECT_ID and SHARED_DEV_VPC_ID after dev deploy"
git push
```

### 6.2. Deploy `staging`

```bash
pnpm sst deploy --stage staging
```

Crea `base-apps-staging` con su propio main. Aislado de dev y prod.

### 6.3. Deploy `prod`

```bash
pnpm sst deploy --stage prod
```

Crea `base-apps-prod` con su propio main. Aislado de dev y staging.

---

## 7. Workflow del developer (después del bootstrap)

Tras el bootstrap inicial, los devs sólo:

```bash
git pull                           # trae .env.example con NEON_DEV_PROJECT_ID y SHARED_DEV_VPC_ID
cp .env.example .env               # si no tienes .env aún
# Edita .env y agrega tu NEON_API_KEY personal
# Verifica que .env tenga NEON_DEV_PROJECT_ID y SHARED_DEV_VPC_ID ANTES del primer sst dev
# (neon.ts y networking/vpc.ts lanzan error en personal stage si faltan)

pnpm sst dev --stage $USER         # crea automáticamente:
                                   #   - branch "$USER" en proyecto base-apps-dev
                                   #   - endpoint para esa branch
                                   #   - connection string inyectado en Lambdas/Services
                                   #   - referencia la VPC + NAT compartidos de dev (SHARED_DEV_VPC_ID)
```

Para resetear datos a estado de `main` (un script `pnpm db:reset` no existe — es ROADMAP; por ahora es manual):

```bash
# Manual: borra tu branch en Neon UI (Branches → tu stage → ⋮ → Delete)
# y vuelve a correr `sst dev --stage $USER` para re-crearla forked de main.
# El sst dev re-aplica las migrations solo (nuevo neonDb.id dispara DbMigrate).
```

Para destruir tu stage al terminar feature:

```bash
pnpm sst remove --stage $USER      # destruye stage AWS + branch Neon automáticamente
```

---

## 8. Migrations automáticas en cada deploy

> **Estado actual: las migrations se aplican AUTOMÁTICAMENTE en cada `sst dev` / `sst deploy`,
> en todos los stages (personal, dev, staging, prod), local y en CI.** No hay que correrlas a mano
> ni tocar los workflows de deploy.

El cableado vive en [`infra/src/databases/migrate.ts`](../infra/src/databases/migrate.ts): un recurso
Pulumi `command.local.Command` (`DbMigrate`) corre `drizzle-kit migrate` **después** de que Neon creó
el proyecto/branch del stage. La dependencia es implícita — el `DATABASE_URL` inyectado es el Output
`databaseUrl` de [`neon.ts`](../infra/src/databases/neon.ts), así que Pulumi espera a que el connection
string del stage se resuelva antes de correr el comando.

Re-corre solo cuando hace falta, vía `triggers`:

- **hash del contenido de `packages/db/migrations/`** (los `.sql` + `meta/_journal.json`): cambia al
  generar/editar una migración → re-aplica.
- **`neonDb.id`**: si la branch/proyecto se recrea (p.ej. borras y re-forkas tu branch personal) → nuevo
  id → re-aplica el schema sobre la BD nueva.

Si nada de eso cambia entre deploys, el comando **no** se re-ejecuta. Y es idempotente de todos modos:
drizzle-kit registra lo aplicado en la tabla `__drizzle_migrations`, así que nunca aplica algo dos veces.

`@todo-list-poc-infra/db` sigue SST-free: la capa infra le pasa el `DATABASE_URL` por env var y el package
solo lee `process.env.DATABASE_URL` desde su `drizzle.config`. El connection string inyectado gana sobre
cualquier `.env` local (dotenv no sobre-escribe vars ya presentes).

### Generar una migración (esto sigue siendo manual)

Lo único manual es **generar** el SQL cuando cambias el schema; **aplicarlo** lo hace el deploy:

```bash
# 1. editas packages/db/src/adapters/postgresql/schema.ts
# 2. generas la migración (drizzle-kit compara schema vs migrations/)
pnpm --filter @todo-list-poc-infra/db db:generate
# 3. commit del .sql generado → el siguiente sst dev/deploy lo aplica solo
```

> ⚠️ **Prod**: el `DbMigrate` corre DDL contra prod en cada push a la rama de prod. Está mitigado por el
> approval gate del GitHub Environment `production` (el deploy no arranca sin aprobación). Si la migración
> falla, **falla el deploy** — intencional.

### Aplicar a mano (escape hatch / debugging)

Casi nunca lo necesitas, pero el comando manual sigue funcionando contra cualquier connection string:

```bash
pnpm --filter @todo-list-poc-infra/db db:migrate                      # usa DATABASE_URL del .env
DATABASE_URL=<otra_url> pnpm --filter @todo-list-poc-infra/db db:migrate
```

---

## 9. Variables resumen

| Variable | Tipo | Dónde | Quién la pone |
|---|---|---|---|
| `NEON_API_KEY` | Secret personal | `.env` (gitignored) | Cada dev (la suya) |
| `NEON_ORG_ID` | Config | `.env.example` (committed) | Setup inicial 1 vez |
| `NEON_DEV_PROJECT_ID` | Config | `.env.example` (committed) | Tras 1er deploy de `dev` |
| `SHARED_DEV_VPC_ID` | Config | `.env.example` (committed) | Tras 1er deploy de `dev` |

---

## 10. Costos

| Concepto | Costo |
|---|---|
| Plan Free Neon (10 proyectos, 0.5 GB c/u, scale-to-zero) | $0 |
| 3 proyectos (prod, staging, dev) en Free | $0 |
| Branches en dev (copy-on-write, sin storage adicional) | $0 |
| **Total mensual (base)** | **$0** |

Cuando un proyecto crezca > 0.5 GB o necesite always-on:
- Launch ($19/mes): 10 GB total, 300 compute hours
- Scale ($69/mes): 50 GB, 750 compute hours

Se upgrade el proyecto individual (típicamente prod primero).

---

## 11. Troubleshooting

### "NEON_API_KEY not set"
- Verifica que `.env` exista en la raíz y tenga la línea `NEON_API_KEY=napi_...`
- Verifica que `pnpm sst dev` lo está cargando (debería ser automático vía SST)

### "Project ID not found" en personal stage
- `NEON_DEV_PROJECT_ID` debe estar en `.env.example` después del deploy de `dev`
- Si no está, pide a un teammate el valor o re-deploya `dev` y captura

### Branch ya existe
- Si `sst dev --stage cristian` falla con "branch already exists", borra manualmente en Neon UI y vuelve a correr
- O usa otro nombre de stage temporalmente

### Cleanup automático
- Cuando un dev hace `sst remove --stage <name>`, SST destruye automáticamente la branch Neon asociada
- Si quedó huérfana: borra desde Neon UI → Branches → ⋮ → Delete
