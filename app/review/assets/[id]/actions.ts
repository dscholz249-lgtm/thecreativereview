"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DecisionInputSchema,
  AnnotationInputSchema,
} from "@/lib/domain/decision";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

// Approve decision. Invariant check lives in three places:
//   1) the DecisionInputSchema discriminated union (typed: feedback/annotations
//      are unreachable on the approve branch),
//   2) this action strips any attempt to smuggle them via FormData,
//   3) the submit_decision RPC + decisions_enforce_approve_has_no_annotations
//      trigger reject at the DB layer.
export async function approveDecisionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const assetId = z.string().uuid().safeParse(formData.get("asset_id"));
  if (!assetId.success) return { ok: false, error: "Invalid asset id." };

  const parsed = DecisionInputSchema.safeParse({
    verdict: "approve",
    asset_version_id: formData.get("asset_version_id"),
  });
  if (!parsed.success || parsed.data.verdict !== "approve") {
    return {
      ok: false,
      error: parsed.success
        ? "Approve decisions cannot include feedback or annotations."
        : parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_decision", {
    p_asset_version_id: parsed.data.asset_version_id,
    p_verdict: "approve",
    p_feedback_text: null,
    p_annotations: [],
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/review/assets/${assetId.data}`);
  revalidatePath("/review/my-reviews");
  redirect("/review/my-reviews");
}

// Reject decision. Accepts either feedback_text, annotations (serialized as
// JSON), or both. Requires at least one. Full invariant enforcement at three
// layers — same as approve.
export async function rejectDecisionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const assetId = z.string().uuid().safeParse(formData.get("asset_id"));
  if (!assetId.success) return { ok: false, error: "Invalid asset id." };

  const feedback_text =
    ((formData.get("feedback_text") as string | null) ?? "").trim() || undefined;
  const annotationsRaw = (formData.get("annotations") as string | null) ?? "[]";

  let annotationsParsed: unknown;
  try {
    annotationsParsed = JSON.parse(annotationsRaw);
  } catch {
    return { ok: false, error: "Malformed annotations payload." };
  }
  const annotations = z
    .array(AnnotationInputSchema)
    .safeParse(annotationsParsed);
  if (!annotations.success) {
    return {
      ok: false,
      error: `Annotation format error: ${annotations.error.issues[0]?.message ?? "invalid"}`,
    };
  }

  const parsed = DecisionInputSchema.safeParse({
    verdict: "reject",
    asset_version_id: formData.get("asset_version_id"),
    feedback_text,
    annotations: annotations.data,
  });
  if (!parsed.success || parsed.data.verdict !== "reject") {
    return {
      ok: false,
      error: parsed.success
        ? "Reject needs feedback or annotations."
        : parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_decision", {
    p_asset_version_id: parsed.data.asset_version_id,
    p_verdict: "reject",
    p_feedback_text: parsed.data.feedback_text ?? null,
    p_annotations: parsed.data.annotations,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/review/assets/${assetId.data}`);
  revalidatePath("/review/my-reviews");
  redirect("/review/my-reviews");
}
