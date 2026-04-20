import { describe, it, expect, vi, beforeEach } from "vitest";
import { track } from "@/lib/analytics";

// The contract we care about: in anything other than NODE_ENV=production,
// track() is a no-op (console.log only) regardless of whether an Amplitude
// key is configured. This keeps noisy events out of prod dashboards during
// CI, local dev, and test runs.

describe("analytics track() in non-production", () => {
  beforeEach(() => {
    // Vitest defaults NODE_ENV to 'test'. Belt + suspenders — pin it here
    // so the assertion is independent of the test runner.
    vi.stubEnv("NODE_ENV", "test");
  });

  it("does not throw for any of the typed event names", () => {
    expect(() =>
      track("signup", { user_id: "u1", workspace_id: "w1" }),
    ).not.toThrow();
    expect(() =>
      track("decision_submitted", {
        workspace_id: "w1",
        properties: { verdict: "approve" },
      }),
    ).not.toThrow();
  });

  it("is a no-op when AMPLITUDE_API_KEY is unset", () => {
    vi.stubEnv("AMPLITUDE_API_KEY", "");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    track("client_created", { properties: { client_id: "c1" } });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
