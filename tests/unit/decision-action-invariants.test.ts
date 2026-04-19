import { describe, expect, it } from "vitest";
import { DecisionInputSchema } from "@/lib/domain/decision";

// Milestone 3 DoD: "A test asserts that you cannot sneak feedback_text
// through on an approval, even by calling the Server Action directly with
// crafted FormData."
//
// The Server Action passes user input through DecisionInputSchema before
// touching the DB. These tests prove the Zod layer strips the fields that
// would violate the approve invariant, in every combination an attacker
// would try.
//
// The DB triggers from milestone 1 (decisions_enforce_approve_has_no_
// annotations) are the second line of defense, verified manually against a
// local Supabase (see supabase/migrations/20260417120000_initial_schema.sql).

const V = "550e8400-e29b-41d4-a716-446655440000";

describe("approve invariant — crafted attack cases", () => {
  it("strips feedback_text smuggled into approve payload", () => {
    const crafted = {
      verdict: "approve" as const,
      asset_version_id: V,
      feedback_text: "looks good, but change the color",
    };
    const result = DecisionInputSchema.safeParse(crafted);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verdict).toBe("approve");
      expect("feedback_text" in result.data).toBe(false);
    }
  });

  it("strips annotations smuggled into approve payload", () => {
    const crafted = {
      verdict: "approve" as const,
      asset_version_id: V,
      annotations: [{ x_pct: 0.5, y_pct: 0.5, comment_text: "sneaky pin" }],
    };
    const result = DecisionInputSchema.safeParse(crafted);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("annotations" in result.data).toBe(false);
    }
  });

  it("strips BOTH feedback_text and annotations from approve payload", () => {
    const crafted = {
      verdict: "approve" as const,
      asset_version_id: V,
      feedback_text: "hmm",
      annotations: [{ x_pct: 0.5, y_pct: 0.5, comment_text: "x" }],
    };
    const result = DecisionInputSchema.safeParse(crafted);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("feedback_text" in result.data).toBe(false);
      expect("annotations" in result.data).toBe(false);
    }
  });
});

describe("reject invariant — content required", () => {
  it("rejects empty reject (no feedback, no annotations)", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
    });
    expect(r.success).toBe(false);
  });

  it("rejects reject with only 1-char feedback", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      feedback_text: "x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects reject with only 2-char feedback", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      feedback_text: "no",
    });
    expect(r.success).toBe(false);
  });

  it("accepts reject with 3-char feedback", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      feedback_text: "nop",
    });
    expect(r.success).toBe(true);
  });

  it("accepts reject with only annotations (no feedback)", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      annotations: [{ x_pct: 0.1, y_pct: 0.2, comment_text: "here" }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects reject with zero-comment-text annotation", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      annotations: [{ x_pct: 0.1, y_pct: 0.2, comment_text: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects annotation with out-of-range percentage", () => {
    const r = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: V,
      annotations: [{ x_pct: -0.1, y_pct: 0.5, comment_text: "nope" }],
    });
    expect(r.success).toBe(false);
  });
});
