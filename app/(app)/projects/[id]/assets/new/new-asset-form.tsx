"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { Upload } from "@/components/cr-icons";
import {
  createAssetWithVersionAction,
  type ActionResult,
} from "@/app/(app)/assets/actions";
import { MAX_UPLOAD_BYTES } from "@/lib/domain/asset";

type AssetType = "image" | "document" | "design" | "wireframe";

const TYPE_CHIPS: Array<{ id: AssetType; label: string; hint: string }> = [
  { id: "image", label: "Image", hint: "PNG / JPEG / SVG" },
  { id: "document", label: "PDF", hint: "Document" },
  { id: "design", label: "Design", hint: "Upload or link" },
  { id: "wireframe", label: "Wireframe", hint: "Upload or link" },
];

export function NewAssetForm({
  projectId,
  cancelHref,
}: {
  projectId: string;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAssetWithVersionAction,
    null,
  );
  const [type, setType] = useState<AssetType>("image");
  const [source, setSource] = useState<"file" | "url">("file");
  const [fileError, setFileError] = useState<string | null>(null);

  const allowUrl = type === "design" || type === "wireframe";
  const effectiveSource = allowUrl ? source : "file";
  const err = state?.ok === false ? state : null;

  return (
    <div className="cr-card-raised p-6 sm:p-7">
      <form
        action={(formData) => {
          // Block oversize uploads before the network round-trip. The same
          // limit is enforced server-side in the action + by Next's
          // serverActions.bodySizeLimit in next.config.ts.
          const f = formData.get("file");
          if (f instanceof File && f.size > MAX_UPLOAD_BYTES) {
            setFileError(formatTooLarge(f.size));
            return;
          }
          setFileError(null);
          action(formData);
        }}
        encType="multipart/form-data"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="type" value={type} />

        <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            placeholder="Homepage hero v1"
            required
            className="cr-input"
          />
        </FormField>

        <FormField label="Type" name="type" error={err?.fieldErrors?.type}>
          <div className="flex flex-wrap gap-2">
            {TYPE_CHIPS.map((chip) => {
              const active = chip.id === type;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setType(chip.id)}
                  className={
                    active
                      ? "cr-btn cr-btn-sm cr-btn-primary"
                      : "cr-btn cr-btn-sm cr-btn-ghost"
                  }
                  title={chip.hint}
                  aria-pressed={active}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </FormField>

        {allowUrl ? (
          <div className="mb-5">
            <div
              className="inline-flex gap-0.5 rounded-lg p-0.5 text-[13px]"
              style={{ border: "1px solid var(--cr-line-strong)" }}
            >
              <button
                type="button"
                onClick={() => setSource("file")}
                className={
                  source === "file" ? "rounded-md px-3 py-1 font-semibold" : "rounded-md px-3 py-1 font-semibold"
                }
                style={
                  source === "file"
                    ? { background: "var(--cr-ink)", color: "var(--cr-card)" }
                    : { color: "var(--cr-muted)" }
                }
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setSource("url")}
                className="rounded-md px-3 py-1 font-semibold"
                style={
                  source === "url"
                    ? { background: "var(--cr-ink)", color: "var(--cr-card)" }
                    : { color: "var(--cr-muted)" }
                }
              >
                External URL
              </button>
            </div>
          </div>
        ) : null}

        {effectiveSource === "file" ? (
          <FormField
            label="File"
            name="file"
            hint="Up to 25 MB. Images (PNG/JPEG/SVG) support annotations; PDFs are text-only feedback."
            error={fileError ?? err?.fieldErrors?.file}
          >
            <div
              className="flex flex-col items-center gap-2.5 px-5 py-7 text-center"
              style={{
                border: "1.5px dashed var(--cr-line-strong)",
                borderRadius: "var(--cr-radius)",
                background: "var(--cr-paper-2)",
              }}
            >
              <span
                className="flex size-11 items-center justify-center rounded-full"
                style={{
                  background: "var(--cr-ink)",
                  color: "var(--cr-card)",
                }}
              >
                <Upload size={18} />
              </span>
              <div
                className="text-[18px]"
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 700,
                }}
              >
                Drop file or click to browse
              </div>
              <div
                className="text-[13px]"
                style={{ color: "var(--cr-muted)" }}
              >
                Images support pin annotations. PDFs are text-only feedback.
              </div>
              <input
                id="file"
                name="file"
                type="file"
                accept={acceptFor(type)}
                required
                className="mt-1 cr-input"
                style={{ maxWidth: 360 }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > MAX_UPLOAD_BYTES) {
                    setFileError(formatTooLarge(f.size));
                  } else {
                    setFileError(null);
                  }
                }}
              />
            </div>
          </FormField>
        ) : (
          <FormField
            label="External URL"
            name="external_url"
            hint="Figma or similar. Reviewers will see the link and leave text feedback."
            error={err?.fieldErrors?.external_url}
          >
            <input
              id="external_url"
              name="external_url"
              type="url"
              placeholder="https://figma.com/..."
              required
              className="cr-input"
            />
          </FormField>
        )}

        <FormField
          label="Upload note"
          name="upload_note"
          hint="Optional. Plain text, max 500 characters. Shown to reviewers as context."
          error={err?.fieldErrors?.upload_note}
        >
          <textarea
            id="upload_note"
            name="upload_note"
            rows={3}
            maxLength={500}
            className="cr-textarea"
            placeholder="What should reviewers focus on?"
          />
        </FormField>

        <FormField
          label="Deadline"
          name="deadline"
          hint="Optional. We'll ping reviewers a couple of days out."
          error={err?.fieldErrors?.deadline}
        >
          <input
            id="deadline"
            name="deadline"
            type="date"
            className="cr-input"
            style={{ maxWidth: 240 }}
          />
        </FormField>

        {err?.error ? (
          <p
            className="mb-4 text-[13px] font-semibold"
            style={{ color: "var(--cr-destructive-ink)" }}
          >
            {err.error}
          </p>
        ) : null}

        <div className="mt-2 flex items-center justify-end gap-2.5">
          <Link href={cancelHref} className="cr-btn cr-btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="cr-btn cr-btn-constructive"
          >
            <Upload /> {pending ? "Uploading…" : "Upload asset"}
          </button>
        </div>
      </form>
    </div>
  );
}

function acceptFor(type: AssetType): string {
  switch (type) {
    case "image":
      return "image/png,image/jpeg,image/svg+xml";
    case "document":
      return "application/pdf";
    case "design":
    case "wireframe":
      return "image/png,image/jpeg";
  }
}

function formatTooLarge(bytes: number): string {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  const capMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
  return `File is ${mb} MB — the upload limit is ${capMb} MB. Try compressing the image or splitting the PDF.`;
}
