import { describe, it, expect } from "vitest";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceBrandingSchema,
  WorkspaceColorSchema,
  WorkspaceIconSchema,
  WorkspaceRoleSchema,
  WORKSPACE_COLOR_PRESETS,
} from "./workspace";

describe("CreateWorkspaceSchema", () => {
  it("acepta nombre + color de preset + emoji", () => {
    const r = CreateWorkspaceSchema.safeParse({ name: "Mi WS", color: "#e040a0", icon: "🍭" });
    expect(r.success).toBe(true);
  });

  it("rechaza color fuera del preset Candy (BR-9)", () => {
    expect(CreateWorkspaceSchema.safeParse({ name: "x", color: "#123456", icon: "🍭" }).success).toBe(false);
  });

  it("rechaza icon que no es emoji (BR-9)", () => {
    expect(CreateWorkspaceSchema.safeParse({ name: "x", color: "#e040a0", icon: "ab" }).success).toBe(false);
  });

  it("rechaza nombre vacío tras trim", () => {
    expect(CreateWorkspaceSchema.safeParse({ name: "   ", color: "#e040a0", icon: "🍭" }).success).toBe(false);
  });

  it("rechaza nombre > 80 chars", () => {
    expect(
      CreateWorkspaceSchema.safeParse({ name: "a".repeat(81), color: "#e040a0", icon: "🍭" }).success,
    ).toBe(false);
  });
});

describe("UpdateWorkspaceBrandingSchema", () => {
  it("acepta un parche con un solo campo", () => {
    expect(UpdateWorkspaceBrandingSchema.safeParse({ name: "nuevo" }).success).toBe(true);
  });

  it("rechaza objeto vacío (al menos un campo)", () => {
    expect(UpdateWorkspaceBrandingSchema.safeParse({}).success).toBe(false);
  });
});

describe("tokens de branding", () => {
  it("todos los presets son hex válidos y el schema los acepta", () => {
    for (const color of WORKSPACE_COLOR_PRESETS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
      expect(WorkspaceColorSchema.safeParse(color).success).toBe(true);
    }
  });

  it("acepta emojis (simples y temáticos)", () => {
    for (const icon of ["🎯", "🚀", "🍬"]) {
      expect(WorkspaceIconSchema.safeParse(icon).success).toBe(true);
    }
  });
});

describe("WorkspaceRoleSchema", () => {
  it("solo owner/member", () => {
    expect(WorkspaceRoleSchema.safeParse("owner").success).toBe(true);
    expect(WorkspaceRoleSchema.safeParse("member").success).toBe(true);
    expect(WorkspaceRoleSchema.safeParse("admin").success).toBe(false);
  });
});
