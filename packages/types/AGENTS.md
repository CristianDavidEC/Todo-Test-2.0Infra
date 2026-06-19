<!-- Owner: @CristianDavidEC -->
# AGENTS.md — `@app/types`

Schemas Zod compartidos = **fuente de verdad** de tipos y validación cross-app.
Ver también el [`AGENTS.md` raíz](../../AGENTS.md).

## Scope

- Solo `zod`. **Cero** imports de SDK/runtime (aws, sst, auth0).
- **Colocación:** un tipo lo usan **2+ apps** → va aquí; una sola app → local en esa app.
- Consumido por `@app/core`, `@app/auth`, `apps/services/example-service`.

## Estructura

```
src/
  index.ts                 → re-exporta todo
  schemas/user.ts          → UserSchema + variantes
  events/domain-event.ts   → envelope + defineEvent()
```

## Patrones

1. **Zod es la fuente; los tipos se infieren.** Nunca escribas un `interface`/`type` paralelo a un schema — usa `z.infer<typeof Schema>` (`User = z.infer<typeof UserSchema>`).
2. **Composición, no duplicación.** Deriva variantes del base con `.pick()`/`.omit()`: `PublicUserSchema = UserSchema.omit({ auth0UserId })`, `CreateUserSchema = UserSchema.pick({…})`. No redefinas el objeto.
3. **`defineEvent(type, version, dataSchema)`** define un evento de dominio versionado: compone `DomainEventEnvelopeSchema.extend({ type: z.literal, version: z.literal, data })` y devuelve `{ type, version, schema, dataSchema } as const`. El `as const` (vía el genérico) narrowea `type` a literal; `version` queda como `string` a nivel TS — el valor exacto se valida en runtime con `z.literal(version)`. Lo consume `@app/core/buildEvent()`.

## Gotchas

- **`version` es estricto `^\d+\.\d+$`** (`"1.0"` ✓, `"1.0.0"` ✗).
- `DomainEventEnvelopeSchema` **no** incluye `data`; el genérico `DomainEvent<T,D>` lo añade a nivel de tipo y `defineEvent` al schema. No metas `data` al envelope base.
- `ActorSchema.id` es opcional (un actor puede ser solo `{ type: "system" }`).

## Receta

- **Nuevo evento de dominio** → schema del `data` + `export const FooCreated = defineEvent("foo.created", "1.0", FooDataSchema)`.
- **Nuevo tipo cross-app** → schema Zod aquí + `z.infer`. Si es de una sola app, déjalo en la app.
