import { describe, it, expect } from "vitest";
import { isFridayNoonLocal } from "@/lib/digest-window";

// The brief demands three-timezone coverage: "the Friday digest worker fires
// reliably in staging for test reviewers in three different timezones". These
// unit tests cover the pure-function half of that guarantee.

describe("isFridayNoonLocal", () => {
  it("returns true at Fri 12:00 UTC with tz=UTC", () => {
    // 2026-04-17 was a Friday.
    const friNoonUtc = new Date("2026-04-17T12:15:00Z");
    expect(isFridayNoonLocal(friNoonUtc, "UTC")).toBe(true);
  });

  it("returns false at Fri 13:00 UTC with tz=UTC", () => {
    const fri1pmUtc = new Date("2026-04-17T13:00:00Z");
    expect(isFridayNoonLocal(fri1pmUtc, "UTC")).toBe(false);
  });

  it("handles America/New_York (UTC-4 in April)", () => {
    // Noon in NYC on Friday 2026-04-17 == 16:00 UTC.
    expect(
      isFridayNoonLocal(new Date("2026-04-17T16:20:00Z"), "America/New_York"),
    ).toBe(true);
    // 11:00 NY == 15:00 UTC — not yet noon.
    expect(
      isFridayNoonLocal(new Date("2026-04-17T15:00:00Z"), "America/New_York"),
    ).toBe(false);
  });

  it("handles Asia/Tokyo (UTC+9, across the UTC date line)", () => {
    // Noon Friday in Tokyo 2026-04-17 == 03:00 UTC same date.
    expect(
      isFridayNoonLocal(new Date("2026-04-17T03:30:00Z"), "Asia/Tokyo"),
    ).toBe(true);
    // 12:00 UTC Friday is 21:00 Friday Tokyo — not noon.
    expect(
      isFridayNoonLocal(new Date("2026-04-17T12:00:00Z"), "Asia/Tokyo"),
    ).toBe(false);
  });

  it("returns false on Thursday and Saturday in same tz", () => {
    const thursNoon = new Date("2026-04-16T12:00:00Z");
    const satNoon = new Date("2026-04-18T12:00:00Z");
    expect(isFridayNoonLocal(thursNoon, "UTC")).toBe(false);
    expect(isFridayNoonLocal(satNoon, "UTC")).toBe(false);
  });

  it("falls back to UTC for an invalid timezone string", () => {
    const friNoonUtc = new Date("2026-04-17T12:30:00Z");
    expect(isFridayNoonLocal(friNoonUtc, "Not/A_Real_Zone")).toBe(true);
  });

  it("accepts null timezone as UTC", () => {
    const friNoonUtc = new Date("2026-04-17T12:00:00Z");
    expect(isFridayNoonLocal(friNoonUtc, null)).toBe(true);
  });
});
