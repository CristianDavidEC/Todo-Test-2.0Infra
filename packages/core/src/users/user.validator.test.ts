import { describe, it, expect } from "vitest";
import { validateEmail, validateUser } from "./user.validator";

describe("validateEmail", () => {
  it("acepta un email válido", () => {
    expect(validateEmail("hello@example.com")).toBe(true);
  });

  it("rechaza un email inválido", () => {
    expect(validateEmail("no-es-email")).toBe(false);
  });
});

describe("validateUser", () => {
  const validUser = {
    id: "11111111-1111-1111-1111-111111111111",
    auth0UserId: "auth0|abc123",
    email: "user@example.com",
    name: "Jane Doe",
    picture: "https://example.com/a.png",
    locale: "es",
    createdAt: "2026-06-02T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
  };

  it("devuelve el User cuando el input es válido", () => {
    expect(validateUser(validUser)).toEqual(validUser);
  });

  it("lanza cuando falta un campo o el tipo es incorrecto", () => {
    expect(() => validateUser({ ...validUser, email: "roto" })).toThrow();
    expect(() => validateUser({ ...validUser, id: "no-uuid" })).toThrow();
  });
});
