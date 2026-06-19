# Paquetes Compartidos

## `packages/types` — Schemas y tipos compartidos

Contiene los **schemas Zod** que son la source of truth de los tipos compartidos entre múltiples aplicaciones; los tipos TypeScript se infieren con `z.infer`. Zod es una dependencia dura de este paquete. No se compila a JavaScript; cada consumidor lo resuelve directamente desde TS.

```
packages/types/
├── src/
│   ├── index.ts                  # Re-exporta schemas + eventos
│   ├── schemas/
│   │   └── user.ts               # UserSchema, PublicUserSchema, CreateUserSchema (+ tipos inferidos)
│   └── events/
│       └── domain-event.ts       # DomainEventEnvelopeSchema, DomainEvent<TType, TData>, defineEvent()
├── tsconfig.json
└── package.json
```

**Regla fundamental:** Si un tipo lo usa más de una app → va en `packages/types`. Si solo lo usa una app → va local en esa app. Todo evento de dominio se define con `defineEvent()` para validación en runtime.

### Schemas Zod como source of truth

Un schema Zod genera el tipo TS con `z.infer`, así nunca se desincronizan. El ejemplo real (`schemas/user.ts`):

```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  auth0UserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).nullable(),
  picture: z.string().url().nullable(),
  locale: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// Derivados sin re-declarar nada a mano:
export const PublicUserSchema = UserSchema.omit({ auth0UserId: true });
export const CreateUserSchema = UserSchema.pick({
  auth0UserId: true, email: true, name: true, picture: true, locale: true,
});
```

### Eventos de dominio con `defineEvent()`

Los eventos también nacen de un schema. `defineEvent(type, version, dataSchema)` compone el sobre canónico (`DomainEventEnvelopeSchema`: `id`, `type`, `version`, `occurredAt`, `source`, `correlationId`, `actor`…) con el `data` específico, y devuelve `{ type, version, schema, dataSchema }`. Ese `schema` es el que valida en runtime (lo consume `buildEvent` de `@app/core`).

**Cómo importar desde cualquier app:**

```typescript
import { UserSchema, CreateUserSchema, defineEvent } from "@app/types";
import type { User, PublicUser, DomainEvent } from "@app/types";
```

Funciona igual en Next.js, Lambdas y servicios NestJS.

---

## `packages/core` — Lógica de negocio pura

Contiene validaciones, transformaciones y reglas de negocio. Sin dependencias de AWS (`aws-sdk`, `@aws-sdk/*`, `aws-lambda`, `sst`) ni de Auth0. Usable en frontend, Lambdas y Fargate. Solo conoce interfaces (p.ej. `publisher.interface.ts`); las implementaciones concretas viven en otros packages o en las apps.

```
packages/core/
├── src/
│   ├── index.ts
│   ├── users/
│   │   └── user.validator.ts     # validateUser, validateEmail
│   └── events/
│       ├── buildEvent.ts         # buildEvent()
│       └── publisher.interface.ts
├── tsconfig.json
└── package.json
```

**Exports reales:** `validateUser`, `validateEmail`, `buildEvent` (más la interfaz `EventPublisher`).

### Validación con Zod

Los schemas viven en `@app/types`; `@app/core` los consume, no re-declara tipos paralelos. Ejemplo real (`users/user.validator.ts`):

```typescript
import { UserSchema, type User } from "@app/types";

export function validateUser(input: unknown): User {
  return UserSchema.parse(input);
}

export function validateEmail(email: string): boolean {
  return UserSchema.shape.email.safeParse(email).success;
}
```

### `buildEvent` — usable en cualquier runtime

`buildEvent(def, data, meta)` toma una definición de `defineEvent()`, arma el sobre y lo valida con `def.schema.parse(...)`. Genera el `id` con `globalThis.crypto.randomUUID()` (Web Crypto, presente en Node 22+, edge y browser) en vez de `node:crypto`, para que `@app/core` siga siendo cross-runtime.

```typescript
import { buildEvent } from "@app/core";
import type { DomainEvent } from "@app/types";
```

---

## `packages/db` — Capa de base de datos

Acceso a datos. **Postgres (Neon + Drizzle) es el único datastore de la base.** No incluye MongoDB, tablas RBAC ni una interfaz genérica `Repository<T>`; cada dominio expone su propia clase Repository.

```
packages/db/
├── src/
│   ├── index.ts                                  # Re-exporta el adapter postgresql
│   └── adapters/postgresql/
│       ├── schema.ts                             # Tablas Drizzle (source of truth): users
│       ├── client.ts                             # getPostgresClient, supportsTransactions, withTransaction
│       ├── users.repository.ts                   # UsersRepository, lazyUpsert, wasJustCreated
│       └── index.ts
├── migrations/                                   # SQL generado por drizzle-kit
├── tsconfig.json
└── package.json
```

### Cliente: autodetección de runtime

`getPostgresClient()` cachea el cliente y elige driver según el runtime, detectado por `AWS_LAMBDA_FUNCTION_NAME`:

- **Lambda** → driver HTTP serverless de Neon (`@neondatabase/serverless` + `drizzle-orm/neon-http`).
- **ECS / NestJS** → pool TCP `pg` (`drizzle-orm/node-postgres`).

Lee el connection string de `process.env.DATABASE_URL` (o el argumento opcional), manteniendo `@app/db` libre de SST.

### Trampa de transacciones

El driver Neon HTTP **no soporta `.transaction()`**: lanza en runtime. El tipo unión `PostgresClient` oculta esa diferencia, así que un `db.transaction(...)` "pasa" en ECS y truena en Lambda. Por eso:

- `supportsTransactions()` → `true` solo fuera de Lambda.
- `withTransaction(db, fn)` → ejecuta dentro de transacción en ECS, o **falla temprano** con un mensaje accionable en Lambda (en vez del críptico error del driver).

Para lógica transaccional, ubícala en un servicio ECS/NestJS, o reescríbela a sentencias únicas / CTEs / `onConflict`.

### `UsersRepository` y `lazyUpsert`

`UsersRepository` (construido con `new UsersRepository(getPostgresClient())`) expone `list`, `create`, `findById`, `findByAuth0Id` y `lazyUpsert`. El método clave es `lazyUpsert`: un **upsert atómico** (`onConflictDoUpdate` sobre el unique de `auth0_user_id`) que es el único punto donde un usuario de Auth0 aterriza en Postgres:

- **usuario nuevo** → crea la fila con los datos del JWT.
- **usuario existente** → refresca `lastSeenAt` y el perfil (email/name/picture/locale) desde el JWT (Auth0 es la fuente de verdad; no hay webhooks).

Al ser `ON CONFLICT` y no check-then-insert, dos requests concurrentes del primer login no compiten por insertar la misma fila (sin 500 por unique). El helper `wasJustCreated(row)` distingue alta de refresh (en un alta `createdAt` y `lastSeenAt` salen del mismo `now()`; en un refresh divergen) — útil para enganchar onboarding solo-en-alta.

**Schema y migraciones:** `adapters/postgresql/schema.ts` es la source of truth. Las migraciones se generan con drizzle-kit:

```bash
pnpm --filter @app/db db:generate   # genera el SQL desde el schema
pnpm --filter @app/db db:migrate    # aplica migraciones
pnpm --filter @app/db db:studio     # explora la BD
```

> **¿Necesitas un datastore documental (MongoDB) o RBAC por BD?** No vienen en la base por simplicidad. Añádelos por proyecto siguiendo las recetas de `packages/db/AGENTS.md`.

---

## `packages/auth` — Autenticación Auth0

Autenticación **Auth0-only**, multi-runtime: el mismo paquete se consume desde Lambda, NestJS y Next.js. El núcleo es agnóstico de framework y cada runtime lo envuelve.

- **Verificación de JWT vía JWKS público** del tenant (`verifyAuth0Token`, con `jose`): el endpoint `.well-known/jwks.json` se cachea ~10 min (`cacheMaxAge: 600_000`), sin red en cada request.
- **`authorizeRequest(req, deps)` es lógica pura**: extrae el Bearer token, verifica firma + audience + issuer, lee los custom claims, hace el lazy upsert en Postgres y devuelve `{ session, user }` (con `user` ya validado como `User` Zod vía `rowToUser`). **Cada runtime la envuelve**: el `example-service` define su **propio** `Auth0Guard` de NestJS (`apps/services/example-service/src/auth/auth0.guard.ts`) — ese es el patrón canónico. El paquete NO exporta un guard listo para no acoplar `@nestjs/common`.
- **Custom claims** bajo un namespace configurable (default `https://app.example.com/`).
- **Upsert lazy del usuario** en `users` la primera vez que un request autenticado pega a una ruta protegida.
- **Subpath `@app/auth/nextjs`** (`middleware/nextjs.middleware.ts`): helper para mapear la sesión de `@auth0/nextjs-auth0` → `AuthSession` cross-platform, sin arrastrar `pg`/`@app/db` al frontend.

**Peer deps opcionales** (`@nestjs/common`, `@auth0/nextjs-auth0`, `@app/db`): nunca son hard-required, así el paquete se consume desde cualquier runtime sin dependencias ajenas. La única dep dura es `@app/types` (+ `jose`). `@app/db` se importa **type-only** (`UsersRepository`); lo provee el consumidor del guard de NestJS.

---

## `packages/observability` — Logging y trazabilidad

Logging estructurado JSON a CloudWatch más propagación de `correlationId`. Multi-runtime, con dos loggers según el destino (ambos como deps normales, no peer):

- **Powertools** para Lambda (`@aws-lambda-powertools/logger`), vía `createPowertoolsLogger` + `instrumentHandler`.
- **Pino** (`pino` + `pino-pretty`), vía `createPinoLogger`. Es agnóstico de runtime y usable también desde Next.js, pero hoy los consumidores reales son `apps/functions` (Lambda, vía Powertools) y `example-service` (NestJS, vía Pino); `apps/web` no lo importa.

**La redacción de secretos es real en ambos paths** (no solo configuración nominal):

- **Pino** combina el `redact` nativo (rápido, rutas conocidas incl. bracket-paths de headers, profundidad fija) con un hook `formatters.log` que aplica `redactObject` recursivo → redacción por-clave a cualquier profundidad.
- **Powertools** (que NO tiene redacción nativa) usa `RedactingLogFormatter`, que replica el formato por defecto pero deep-redacta los atributos adicionales con `redactObject`.

**`correlationId`** se propaga por `AsyncLocalStorage`: en Lambda lo ancla `instrumentHandler`; en NestJS un `correlationMiddleware` global + un `mixin` de Pino que inyecta `correlationId` (y `userId` si lo pobló el guard) en cada línea. Las llamadas HTTP salientes deben leerlo con `getCorrelationId()` e inyectarlo con `injectCorrelationHeader`.

---

## `packages/config` — Presets centralizados

Centraliza tsconfig + eslint + vitest para que ningún package duplique opciones de compilador.

- **tsconfig:** `tsconfig.base.json`, `tsconfig.node.json`, `tsconfig.nextjs.json`, `tsconfig.nest.json`, `tsconfig.sst.json`.
- **ESLint (flat config):** `eslint.base.js`, `eslint.node.js`, `eslint.nextjs.js`.
- **Vitest:** preset `./vitest/base`.

Cada package extiende de aquí (`@app/config`); modifica el preset central en vez de hacer overrides ad-hoc.

---

## Cómo agregar un nuevo paquete compartido

1. Crear la carpeta en `packages/<nombre>/`
2. Crear `package.json` con nombre `@app/<nombre>` y dependencias internas necesarias
3. Crear `tsconfig.json` extendiendo `@app/config/tsconfig.node.json`
4. Crear `src/index.ts` como punto de entrada
5. Agregar como dependencia en las apps que lo necesiten: `"@app/<nombre>": "workspace:*"`
6. Ejecutar `pnpm install` desde la raíz
