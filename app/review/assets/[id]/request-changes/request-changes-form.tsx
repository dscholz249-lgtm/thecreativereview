"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Annotator, clearAnnotatorDraft } from "@/components/annotator";
import { rejectDecisionAction } from "../actions";

type DraftPin = {
  localId: string;
  x_pct: number;
  y_pct: number;
  comment_text: string;
};

type Props = {
  assetId: string;
  versionId: string;
  assetName: string;
  imageUrl: string | null;
  nonImageFallbackUrl: string | null;
  flow: "image" | "non_image";
};

export function RequestChangesForm({
  assetId,
  versionId,
  assetName,
  imageUrl,
  nonImageFallbackUrl,
  flow,
}: Props) {
  const [pins, setPins] = useState<DraftPin[]>([]);
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Image flow requires at least one pin with non-empty text (PRD 7.8.2).
  // Non-image flow requires feedback_text >= 3 chars (PRD 7.8.3).
  const readyAnnotations = pins.filter((p) => p.comment_text.trim().length > 0);
  const canSubmit =
    flow === "image"
      ? readyAnnotations.length > 0
      : generalFeedback.trim().length >= 3;

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("asset_id", assetId);
    formData.set("asset_version_id", versionId);
    formData.set(
      "annotations",
      JSON.stringify(
        readyAnnotations.map(({ x_pct, y_pct, comment_text }) => ({
          x_pct,
          y_pct,
          comment_text: comment_text.trim(),
        })),
      ),
    );
    formData.set("feedback_text", generalFeedback.trim());

    startTransition(async () => {
      const result = await rejectDecisionAction(null, formData);
      if (result.ok === false) {
        setError(result.error);
      } else {
        clearAnnotatorDraft(versionId);
        // rejectDecisionAction already redirects to /my-reviews on success.
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {flow === "image" && imageUrl ? (
        <>
          <Annotator
            versionId={versionId}
            imageUrl={imageUrl}
            imageAlt={assetName}
            onChange={setPins}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Overall feedback (optional)
            </label>
            <Textarea
              placeholder="Anything else to add beyond the pins?"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={3}
              maxLength={4000}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {nonImageFallbackUrl ? (
            <a
              href={nonImageFallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-neutral-200 bg-white p-3 text-sm text-blue-700 underline"
            >
              Open {assetName} in a new tab
            </a>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Your feedback
            </span>
            <Textarea
              placeholder="What needs to change? (At least 3 characters.)"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={6}
              required
              minLength={3}
              maxLength={4000}
            />
          </label>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 py-3">
        <p className="text-xs text-neutral-500">
          {flow === "image"
            ? readyAnnotations.length > 0
              ? `${readyAnnotations.length} pin${readyAnnotations.length === 1 ? "" : "s"} ready`
              : "Add at least one pin to describe what needs to change."
            : "Minimum 3 characters."}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/assets/${assetId}`}
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Back
          </Link>
          <Button type="submit" disabled={!canSubmit || pending}>
            {pending ? "Submitting…" : "Submit changes requested"}
          </Button>
        </div>
      </div>
    </form>
  );
}
