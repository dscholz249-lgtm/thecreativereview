"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DecisionInputSchema,
  AnnotationInputSchema,
} from "@/lib/domain/decision";
import {
  notifyDecisionSubmitted,
  notifyProjectCompletedIfNeeded,
} from "@/lib/notifications";

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

  await fireDecisionNotifications(
    supabase,
    assetId.data,
    parsed.data.asset_version_id,
  );

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

  await fireDecisionNotifications(
    supabase,
    assetId.data,
    parsed.data.asset_version_id,
  );

  revalidatePath(`/review/assets/${assetId.data}`);
  revalidatePath("/review/my-reviews");
  redirect("/review/my-reviews");
}

// Fires both the decision-submitted admin email and — if the decision just
// flipped the last pending asset — the project-completed email. Best-effort:
// email failures log but never fail the action.
async function fireDecisionNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assetId: string,
  assetVersionId: string,
): Promise<void> {
  try {
    await notifyDecisionSubmitted({ asset_version_id: assetVersionId });
  } catch (err) {
    console.error("[notify] decision submitted failed", err);
  }

  // Look up project_id so we can check completion. The reviewer has RLS
  // select on their clients' assets, so this is allowed.
  const { data: asset } = await supabase
    .from("assets")
    .select("project_id")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return;

  try {
    await notifyProjectCompletedIfNeeded(asset.project_id);
  } catch (err) {
    console.error("[notify] project completed failed", err);
  }
}
