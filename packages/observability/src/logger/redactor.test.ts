import { describe, it, expect } from "vitest";
import { redactObject, REDACTED } from "./redactor";

describe("redactObject", () => {
  it("redacta claves sensibles en el primer nivel (case-insensitive)", () => {
    const out = redactObject({ email: "a@b.com", Password: "hunter2", token: "abc" });
    expect(out).toEqual({ email: "a@b.com", Password: REDACTED, token: REDACTED });
  });

  it("redacta a CUALQUIER profundidad (paridad recursiva, no solo paths fijos)", () => {
    const out = redactObject({ a: { b: { c: { authorization: "Bearer x" } } } });
    expect((out.a.b.c as { authorization: string }).authorization).toBe(REDACTED);
  });

  it("recorre arrays y no muta el input original", () => {
    const input = { items: [{ secret: "s1" }, { secret: "s2" }] };
    const out = redactObject(input);
    expect(out.items.map((i) => i.secret)).toEqual([REDACTED, REDACTED]);
    expect(input.items[0].secret).toBe("s1"); // sin mutación
  });

  it("es seguro ante referencias circulares", () => {
    const circular: Record<string, unknown> = { name: "x" };
    circular.self = circular;
    expect(() => redactObject(circular)).not.toThrow();
  });

  it("deja intactos los valores no-objeto (Date)", () => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    const out = redactObject({ when: d });
    expect(out.when).toBe(d);
  });
});
