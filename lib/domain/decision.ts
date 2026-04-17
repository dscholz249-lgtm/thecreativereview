import { z } from "zod";

// Decision invariant, type-level.
//
// PRD section 7.8 + 8:
//   * Approve → feedback_text MUST be null, zero annotations by this reviewer
//     on this version.
//   * Reject → at least one of: feedback_text (>= 3 chars), or >= 1 annotation.
//
// This discriminated union makes `feedback_text` and `annotations` unreachable
// on the approve branch at the type level. Server Actions should accept
// `DecisionInput`, not a flat object — the narrowing is the point.

export const AnnotationInputSchema = z.object({
  x_pct: z.number().min(0).max(1),
  y_pct: z.number().min(0).max(1),
  comment_text: z.string().min(1).max(2000),
});
export type AnnotationInput = z.infer<typeof AnnotationInputSchema>;

export const ApproveDecisionSchema = z.object({
  verdict: z.literal("approve"),
  asset_version_id: z.string().uuid(),
});

export const RejectDecisionSchema = z
  .object({
    verdict: z.literal("reject"),
    asset_version_id: z.string().uuid(),
    feedback_text: z.string().trim().min(3).max(4000).optional(),
    annotations: z.array(AnnotationInputSchema).default([]),
  })
  .refine(
    (value) => Boolean(value.feedback_text) || value.annotations.length > 0,
    {
      message:
        "A reject decision needs feedback_text (>= 3 chars) or at least one annotation.",
      path: ["feedback_text"],
    },
  );

export const DecisionInputSchema = z.discriminatedUnion("verdict", [
  ApproveDecisionSchema,
  RejectDecisionSchema,
]);

export type DecisionInput = z.infer<typeof DecisionInputSchema>;
export type ApproveDecisionInput = z.infer<typeof ApproveDecisionSchema>;
export type RejectDecisionInput = z.infer<typeof RejectDecisionSchema>;

// Runtime narrowing helpers — useful in Server Actions where the discriminant
// lives in FormData and we want to be explicit at the branch.
export function isApprove(input: DecisionInput): input is ApproveDecisionInput {
  return input.verdict === "approve";
}
export function isReject(input: DecisionInput): input is RejectDecisionInput {
  return input.verdict === "reject";
}
