import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineEvent } from "@app/types";
import { buildEvent } from "./buildEvent";

const UserRegistered = defineEvent(
  "user.registered",
  "1.0",
  z.object({ userId: z.string().uuid() }),
);

describe("buildEvent", () => {
  it("construye un evento válido con id UUID y occurredAt ISO", () => {
    const evt = buildEvent(
      UserRegistered,
      { userId: "11111111-1111-1111-1111-111111111111" },
      { source: "example-service", correlationId: "corr-1" },
    );

    expect(evt.type).toBe("user.registered");
    expect(evt.version).toBe("1.0");
    expect(evt.source).toBe("example-service");
    expect(evt.correlationId).toBe("corr-1");
    expect(evt.data.userId).toBe("11111111-1111-1111-1111-111111111111");
    expect(evt.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => new Date(evt.occurredAt).toISOString()).not.toThrow();
  });

  it("lanza (validación Zod del sobre) si los datos no cumplen el schema", () => {
    expect(() =>
      buildEvent(
        UserRegistered,
        // @ts-expect-error userId debe ser UUID
        { userId: 123 },
        { source: "svc", correlationId: "c" },
      ),
    ).toThrow();
  });
});
