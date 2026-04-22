"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Annotator, clearAnnotatorDraft } from "@/components/annotator";
import { X } from "@/components/cr-icons";
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
            <label className="cr-eyebrow mb-2 block">
              Overall feedback (optional)
            </label>
            <textarea
              placeholder="Anything else to add beyond the pins?"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={3}
              maxLength={4000}
              className="cr-textarea"
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
              className="cr-card cr-link p-4 text-[14px]"
            >
              Open {assetName} in a new tab ↗
            </a>
          ) : null}
          <label>
            <span className="cr-eyebrow mb-2 block">Your feedback</span>
            <textarea
              placeholder="What needs to change? (At least 3 characters.)"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={6}
              required
              minLength={3}
              maxLength={4000}
              className="cr-textarea"
            />
          </label>
        </div>
      )}

      {error ? (
        <p
          className="text-[14px] font-semibold"
          style={{ color: "var(--cr-destructive-ink)" }}
        >
          {error}
        </p>
      ) : null}

      <div
        className="sticky bottom-0 flex items-center justify-between gap-3 py-4"
        style={{
          borderTop: "1px solid var(--cr-line)",
          background: "var(--cr-paper)",
        }}
      >
        <p className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
          {flow === "image"
            ? readyAnnotations.length > 0
              ? `${readyAnnotations.length} pin${readyAnnotations.length === 1 ? "" : "s"} ready`
              : "Add at least one pin to describe what needs to change."
            : "Minimum 3 characters."}
        </p>
        <div className="flex gap-2.5">
          <Link
            href={`/review/assets/${assetId}`}
            className="cr-btn cr-btn-sm cr-btn-ghost"
          >
            Back
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="cr-btn cr-btn-sm cr-btn-destructive"
          >
            <X size={14} />{" "}
            {pending ? "Submitting…" : "Submit changes requested"}
          </button>
        </div>
      </div>
    </form>
  );
}
