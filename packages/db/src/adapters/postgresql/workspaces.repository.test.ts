import { describe, it, expect } from "vitest";
import { assertKeepsAnOwner, LastOwnerError } from "./workspaces.repository";

/**
 * Invariante BR-5 ("siempre ≥1 Owner") como lógica PURA.
 *
 * La protección real contra carreras vive en el `FOR UPDATE` dentro de
 * `withTransaction` (ver `WorkspacesRepository.lockOwners`), que requiere un Postgres
 * vivo y por tanto un test de integración — diferido hasta tener infra de test-DB
 * (ramas Neon efímeras, ver ROADMAP). Aquí cubrimos la decisión, que es donde está
 * la regla de negocio: `lockOwners` solo aporta el conteo correcto.
 */
describe("assertKeepsAnOwner", () => {
  it("bloquea remover/degradar al ÚLTIMO owner", () => {
    expect(() => assertKeepsAnOwner(1, true)).toThrow(LastOwnerError);
  });

  it("permite remover/degradar a un owner cuando hay otros", () => {
    expect(() => assertKeepsAnOwner(2, true)).not.toThrow();
  });

  it("permite operar sobre un member aunque sea el único owner restante (no reduce owners)", () => {
    // removesAnOwner=false → la operación no toca el conteo de owners
    expect(() => assertKeepsAnOwner(1, false)).not.toThrow();
  });

  it("borde: 0 owners + operación que remueve owner → bloquea", () => {
    expect(() => assertKeepsAnOwner(0, true)).toThrow(LastOwnerError);
  });
});
