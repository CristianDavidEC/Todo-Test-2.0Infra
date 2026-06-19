<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@todo-list-poc-infra/core`

Lógica de negocio **pura** + interfaces. Sin runtime ni SDKs.
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- Solo `zod` y `@todo-list-poc-infra/types`. Para IDs usa `globalThis.crypto.randomUUID()` (Web Crypto, disponible en Node 22+/edge/browser) — **no** importa `node:crypto`, así core sigue siendo usable en cualquier runtime.
- 🚫 **PROHIBIDO importar** `aws-sdk`/`@aws-sdk/*`, `aws-lambda`, `sst`, `@auth0/*`. Es la regla dura del paquete (hoy verificado limpio). Si necesitas un SDK, va en el adapter/app que consume core, **no aquí**.
- Importable desde web, Lambdas y servicios ECS por igual; hoy el único que lo **importa** es `apps/web`. `apps/services/example-service` lo declara como dependencia (listo para usarlo, como ejemplo del molde) pero aún no lo importa; `apps/functions` no lo declara.

## Estructura

```
src/
  events/
    publisher.interface.ts   → interface EventPublisher (sin implementación)
    buildEvent.ts            → builder validado de eventos de dominio
  users/user.validator.ts    → validateUser / validateEmail
```

## Patrones

1. **Inversión de dependencias.** Core define **interfaces** (`EventPublisher`), no implementaciones. El adapter concreto (EventBridge/SQS/…) vive en otro paquete o app y se inyecta. No importes un cliente aquí.
2. **Validación vía `@todo-list-poc-infra/types`.** Core no define schemas; los consume. `validateUser`/`validateEmail` envuelven `UserSchema`; `buildEvent()` valida el envelope completo y genera el `id` (uuid) internamente.
3. **Pure & testeable** — sin env vars ni SDKs, se prueba sin AWS/Auth0.

## Gotcha

- `validateEmail` navega el shape (`UserSchema.shape.email.safeParse`) en vez de lanzar — devuelve boolean.

## Receta

- **Nueva capacidad de negocio** → función pura aquí (valida con `@todo-list-poc-infra/types`). Si necesita I/O (DB, HTTP, SDK), define una **interface** aquí y su implementación **fuera** de core.
