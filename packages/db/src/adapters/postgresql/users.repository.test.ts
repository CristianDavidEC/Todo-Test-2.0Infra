import { describe, it, expect } from "vitest";
import { wasJustCreated } from "./users.repository";
import type { UserRow } from "./schema";

function row(createdAt: Date, lastSeenAt: Date): UserRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    auth0UserId: "auth0|abc",
    email: "u@example.com",
    name: null,
    picture: null,
    locale: null,
    createdAt,
    lastSeenAt,
  };
}

describe("wasJustCreated", () => {
  it("es true cuando created_at === last_seen_at (alta)", () => {
    const t = new Date("2026-06-02T00:00:00.000Z");
    expect(wasJustCreated(row(new Date(t), new Date(t)))).toBe(true);
  });

  it("es false cuando last_seen_at diverge (refresh)", () => {
    const created = new Date("2026-06-02T00:00:00.000Z");
    const seen = new Date("2026-06-03T10:00:00.000Z");
    expect(wasJustCreated(row(created, seen))).toBe(false);
  });
});
