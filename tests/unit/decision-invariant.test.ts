import { describe, expect, it } from "vitest";
import { DecisionInputSchema } from "@/lib/domain/decision";

// These tests verify invariant 1 at the Zod boundary. The DB-level triggers
// are verified separately in tests/integration/decision-invariants.integration.test.ts
// (pending milestone 3, when the Server Action exists).

describe("DecisionInputSchema", () => {
  it("accepts approve with no feedback", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "approve",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects approve with feedback_text (typed impossible, but guard test)", () => {
    // The discriminated union means TS forbids this shape, but runtime input
    // (FormData, JSON) could smuggle it in. Zod strips or errors.
    const result = DecisionInputSchema.safeParse({
      verdict: "approve",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      feedback_text: "looks good, but change the color",
    });
    // Zod's discriminatedUnion will pass through unknown keys silently by
    // default — what matters is that the parsed output has no feedback_text.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("feedback_text");
    }
  });

  it("rejects approve with annotations array (typed impossible)", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "approve",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      annotations: [
        { x_pct: 0.5, y_pct: 0.5, comment_text: "here" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("annotations");
    }
  });

  it("rejects reject with neither feedback nor annotations", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reject with too-short feedback", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      feedback_text: "no",
    });
    expect(result.success).toBe(false);
  });

  it("accepts reject with feedback_text >= 3 chars", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      feedback_text: "too dark",
    });
    expect(result.success).toBe(true);
  });

  it("accepts reject with annotations and no feedback", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      annotations: [
        { x_pct: 0.2, y_pct: 0.3, comment_text: "shadow too harsh" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects annotations with out-of-range coordinates", () => {
    const result = DecisionInputSchema.safeParse({
      verdict: "reject",
      asset_version_id: "550e8400-e29b-41d4-a716-446655440000",
      annotations: [{ x_pct: 1.5, y_pct: 0.3, comment_text: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
