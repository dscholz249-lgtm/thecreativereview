import { describe, it, expect } from "vitest";
import { buildWorkspaceSummaries } from "@/lib/superadmin";

describe("buildWorkspaceSummaries", () => {
  it("joins admin emails, counts non-archived clients, sorts owners first", () => {
    const summaries = buildWorkspaceSummaries({
      workspaces: [
        {
          id: "w1",
          name: "Acme",
          plan: "solo",
          trial_ends_at: null,
          stripe_subscription_id: "sub_1",
          created_at: "2026-04-01T00:00:00Z",
        },
        {
          id: "w2",
          name: "Bravo",
          plan: "studio",
          trial_ends_at: "2026-05-15T00:00:00Z",
          stripe_subscription_id: null,
          created_at: "2026-05-01T00:00:00Z",
        },
      ],
      adminProfiles: [
        { user_id: "u1", workspace_id: "w1", role: "owner", name: "Ava" },
        { user_id: "u2", workspace_id: "w1", role: "member", name: null },
        { user_id: "u3", workspace_id: "w2", role: "owner", name: "Bo" },
      ],
      clients: [
        { workspace_id: "w1", archived: false },
        { workspace_id: "w1", archived: false },
        { workspace_id: "w1", archived: true }, // archived, must not count
        { workspace_id: "w2", archived: false },
      ],
      authUsers: [
        { id: "u1", email: "ava@acme.test" },
        { id: "u2", email: "zoe@acme.test" },
        { id: "u3", email: "bo@bravo.test" },
      ],
    });

    // Sort: newest first → Bravo before Acme.
    expect(summaries.map((s) => s.id)).toEqual(["w2", "w1"]);

    const acme = summaries.find((s) => s.id === "w1")!;
    expect(acme.admin_count).toBe(2);
    expect(acme.active_client_count).toBe(2);
    expect(acme.has_subscription).toBe(true);
    // Owner first, then member alphabetically by email.
    expect(acme.admins.map((a) => a.email)).toEqual([
      "ava@acme.test",
      "zoe@acme.test",
    ]);

    const bravo = summaries.find((s) => s.id === "w2")!;
    expect(bravo.admin_count).toBe(1);
    expect(bravo.active_client_count).toBe(1);
    expect(bravo.has_subscription).toBe(false);
    expect(bravo.trial_ends_at).toBe("2026-05-15T00:00:00Z");
  });

  it("handles workspaces with zero admins and zero clients gracefully", () => {
    const [empty] = buildWorkspaceSummaries({
      workspaces: [
        {
          id: "w1",
          name: "Ghost",
          plan: "solo",
          trial_ends_at: null,
          stripe_subscription_id: null,
          created_at: "2026-05-01T00:00:00Z",
        },
      ],
      adminProfiles: [],
      clients: [],
      authUsers: [],
    });
    expect(empty.admin_count).toBe(0);
    expect(empty.active_client_count).toBe(0);
    expect(empty.admins).toEqual([]);
  });

  it("surfaces null email when the auth user can't be resolved", () => {
    const [w] = buildWorkspaceSummaries({
      workspaces: [
        {
          id: "w1",
          name: "Orphan",
          plan: "solo",
          trial_ends_at: null,
          stripe_subscription_id: null,
          created_at: "2026-05-01T00:00:00Z",
        },
      ],
      adminProfiles: [
        { user_id: "u_missing", workspace_id: "w1", role: "owner", name: null },
      ],
      clients: [],
      authUsers: [],
    });
    expect(w.admins[0]?.email).toBeNull();
  });
});
