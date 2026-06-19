# Configuración Auth0

> Pasos para configurar Auth0 como provider de identidad. La empresa ya tiene cuenta corporativa de Auth0 — este doc asume que tienes acceso a ella o que un admin te lo dará.

## Estrategia de tenants

La plantilla usa **3 tenants Auth0** (uno por stage compartido):

| Stage | Tenant Auth0 | Notas |
|---|---|---|
| `prod` | `<empresa>-prod` | Tenant productivo, datos reales, MFA obligatorio |
| `staging` | `<empresa>-staging` | Pre-prod, datos sintéticos |
| `dev` y personales | `<empresa>-dev` | Compartido entre `dev` y todas las personal stages — usuarios test consistentes para demos |

**Por qué tenants separados:**
- Aislamiento total prod ↔ no-prod (logs, usuarios, conexiones)
- Cambios de Auth0 config en dev no afectan prod
- Quotas independientes
- Diferentes proveedores sociales si aplica (ej: prod tiene Google + Apple, dev sólo email)

**Por qué `dev` y personales comparten tenant:**
- Mismos test users → demos consistentes entre devs (resuelve el dolor histórico de "datos distintos por dev")
- Mismas Connections / Actions configuradas una vez
- Cada developer accede al mismo tenant con sus propias credenciales corp

---

## 1. Verificar acceso al organization Auth0 de la empresa

1. Login en https://auth0.com con tus credenciales corporativas
2. Verifica que aparezca el organization (`<empresa>`) en el selector arriba a la izquierda
3. Si no aparece, pídele a un admin que te invite

---

## 2. Crear / verificar tenants por stage

Si los 3 tenants ya existen, salta al paso 3. Si no:

1. Dashboard Auth0 → click en el switcher de tenant arriba → **Create tenant**
2. Domain: `<empresa>-<stage>` (ej: `empresa-dev`)
3. Region: **US** (alinea con `us-east-1` de AWS)
4. Environment Tag: **Development** / **Staging** / **Production** según corresponda
5. Repite para los 3 stages

> Nota: los tenants Auth0 son globales (no por región AWS); pero la latencia mejora si están en la región más cercana a tus usuarios.

---

## 3. Por cada tenant: crear la Application (Web App)

Aplica para cada tenant (`dev`, `staging`, `prod`):

1. Tenant Auth0 → **Applications → Applications → Create Application**
2. Name: `Base App Web` (o el nombre del proyecto derivado cuando se clone)
3. Type: **Regular Web Applications**
4. Skip the quickstart, abre la pestaña **Settings**
5. Configurar:

| Campo | Valor |
|---|---|
| **Allowed Callback URLs** | `https://<web-url>/auth/callback`, `http://localhost:3000/auth/callback` (la callback es de la **web** Next.js: `${APP_BASE_URL}/auth/callback`, no del API) |
| **Allowed Logout URLs** | `https://<web-url>/`, `http://localhost:3000/` |
| **Allowed Web Origins** | `https://<web-url>`, `http://localhost:3000` |
| **Token Endpoint Authentication Method** | `Post` |
| **Application Login URI** | `https://<web-url>/auth/login` |
| **JWT Signature Algorithm** | `RS256` |

6. **Captura para `.env`:**
   - **Domain** (ej: `empresa-dev.us.auth0.com`) → `AUTH0_DOMAIN`
   - **Client ID** → `AUTH0_CLIENT_ID`
   - **Client Secret** → `AUTH0_CLIENT_SECRET` (secret — vía env var: GitHub Environment Secret en deploy / `.env` local)

---

## 4. Por cada tenant: crear la API (Resource Server)

La API es el "audience" del JWT que las Lambdas/ECS validan.

1. Tenant Auth0 → **Applications → APIs → Create API**
2. Name: `Base App API`
3. Identifier (audience): `https://api.base-apps.<stage>.com` (puede ser cualquier URI, no necesita ser real)
4. Signing Algorithm: `RS256`
5. **Captura:**
   - **Identifier** → `AUTH0_AUDIENCE`

Habilita en la pestaña **Settings** de la API:
- **Enable RBAC**: ON
- **Add Permissions in the Access Token**: ON
- **Allow Skipping User Consent**: ON (para clientes first-party)

---

## 5. Configurar Connections (base de usuarios)

Por cada tenant:

1. **Authentication → Database**
2. Default `Username-Password-Authentication` debería existir
3. Asegúrate que esté **Enabled** para tu Application

Para social logins (opcional, recomendado para dev):

1. **Authentication → Social**
2. Habilita Google: configura Client ID/Secret de un proyecto Google Cloud Console
3. Habilita Apple si aplica

---

## 6. (Opcional / por proyecto) Crear la Action: inyectar custom claims

> **La plantilla base NO incluye Auth0 Actions.** Se omiten a propósito porque dependen de las reglas de negocio de cada proyecto (qué roles/permissions existen, de dónde salen, qué claims inyectar). El **mecanismo RBAC del lado de la app ya está cableado y listo** (`readCustomClaims`/`claims.ts`, helpers `requireRole/requireAnyRole/requirePermission`, `RolesGuard` en NestJS, lectura de roles en el dashboard). Sin Action, los claims `roles`/`permissions` simplemente llegan vacíos y el RBAC no bloquea por rol — la autenticación (login + lazy sync) funciona igual. Esta sección es la **referencia** para cuando un proyecto derivado necesite poblar esos claims según sus reglas.

Para que el JWT incluya roles/permissions desde nuestra Postgres:

1. Tenant Auth0 → **Actions → Library → Build Custom**
2. Name: `Add Custom Claims`
3. Trigger: `Login / Post Login`
4. Runtime: `Node 22`
5. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://app.example.com/';

  // Roles asignados al usuario en Auth0 (vía Roles tab)
  const roles = event.authorization?.roles ?? [];

  // Claims customizados que llegan al JWT
  api.idToken.setCustomClaim(`${namespace}roles`, roles);
  api.accessToken.setCustomClaim(`${namespace}roles`, roles);

  // Identificador interno del usuario (para que la app lo lea sin parsear sub)
  api.accessToken.setCustomClaim(`${namespace}user_id`, event.user.user_id);
};
```

6. **Deploy** y luego en **Actions → Flows → Login** → arrastra la Action a la posición correspondiente
7. **Apply**

> **Al implementarla en un proyecto derivado**, versiona el código de la Action en este repo bajo `auth0/actions/post-login.js` para que sea auditable y replicable entre tenants (documenta en `auth0/README.md`). La plantilla base no trae ese archivo a propósito (ver el aviso al inicio de esta sección).

---

## 7. Configurar `.env` local

En la raíz del repo:

```bash
cp .env.example .env
```

Edita `.env` con los valores capturados del tenant `dev`:

```bash
# Auth0 — stage dev
AUTH0_DOMAIN="empresa-dev.us.auth0.com"
AUTH0_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
AUTH0_AUDIENCE="https://api.base-apps.dev.com"

# Secret — NO commitear
AUTH0_CLIENT_SECRET="<copy from Auth0 dashboard, NEVER commit>"
AUTH0_SECRET="<32 char random string para cifrar las cookies de sesión de Next.js>"
```

> **Nota:** la env var que el código lee es `AUTH0_SECRET` (la pide el SDK
> `@auth0/nextjs-auth0` en `apps/web/src/lib/auth0.ts` y se inyecta en
> `infra/src/webs/web.ts`). Es la misma env var en local y en deploy.

Generar `AUTH0_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 8. Proveer los secrets Auth0 por stage (env vars)

`AUTH0_CLIENT_SECRET` y `AUTH0_SECRET` se manejan como **env vars**, igual que el resto de
la config — una sola fuente de verdad. Se inyectan **solo a la web Next.js**
(`infra/src/webs/web.ts`, vía `requireSharedEnv`). El ECS NestJS NO los recibe: solo
`AUTH0_DOMAIN`/`AUTH0_AUDIENCE`/`AUTH0_NAMESPACE`, porque verifica el JWT contra el JWKS
público y no necesita el client secret.

- **Local (tu stage personal):** ponlos en tu `.env` (ver §7). Nada más.
- **dev / staging / prod (deploy):** como **Secrets del GitHub Environment**
  correspondiente (`development`/`staging`/`production`) — NO a nivel repo, porque difieren
  por tenant. Los workflows de deploy ya los inyectan vía `env:`. Ver
  [`docs/SETUP-CICD.md`](SETUP-CICD.md) §2.1.

Los valores **no secretos** (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`) van como
**Variables** del Environment. La config se cablea en `infra/src/webs/web.ts` (web) y
`infra/src/services/workers.ts` (ECS), no en un archivo de config aparte.

---

## 9. Variables resumen

| Variable | Tipo | Dónde | Por stage |
|---|---|---|---|
| `AUTH0_DOMAIN` | Config pública | `.env.example` (committed) | Sí |
| `AUTH0_CLIENT_ID` | Config pública | `.env.example` (committed) | Sí |
| `AUTH0_AUDIENCE` | Config pública | `.env.example` (committed) | Sí |
| `AUTH0_CLIENT_SECRET` | Secret | `.env` local · GitHub Environment Secret en deploy | Sí |
| `AUTH0_SECRET` | Secret | `.env` local · GitHub Environment Secret en deploy | Sí |

Los IDs públicos (Domain, Client ID, Audience) **NO son secretos** — están embebidos en el JS del frontend cuando hace login. Por eso pueden ir en `.env.example` committed.

---

## 10. Validación

Después del setup, en tu stage personal:

```bash
pnpm sst dev --stage $USER

# Una vez deploya el web app:
open https://<web-url>/auth/login
```

Esperado:
- Redirect a `https://empresa-dev.us.auth0.com/...` (Universal Login)
- Registro / login funciona
- Tras login, redirect a `<web-url>` con cookie de sesión
- Endpoint `/auth/profile` devuelve el perfil (SDK v4)
- Backend API valida JWT correctamente

---

## 11. Troubleshooting

### "Invalid token: audience mismatch"
- Verifica que `AUTH0_AUDIENCE` coincida exactamente con el Identifier de la API en Auth0

### "Callback URL mismatch"
- Verifica que la URL de callback esté EXACTAMENTE en la lista de Allowed Callback URLs en la Application Auth0
- Incluye `http://localhost:3000/auth/callback` para dev local

### "Invalid Compact JWS" / 401
- El JWT no tiene el formato esperado o expiró
- Verifica que `AUTH0_CLIENT_SECRET` esté seteado correctamente como env var (GitHub Environment Secret en deploy / `.env` local)

### Custom claims no aparecen en el JWT
- Verifica que la Action `Add Custom Claims` esté **activa en el flow Login** (no sólo deployada)
- Verifica el namespace `https://app.example.com/` coincida en código y Action

---

## 12. Próximos pasos

El código de `packages/auth/` (verificación JWT vía JWKS + lazy upsert) consume estos tenants. Ver [05-paquetes-compartidos.md](./05-paquetes-compartidos.md) y `packages/auth/AGENTS.md`.
