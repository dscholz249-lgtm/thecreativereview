"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form-field";
import { Upload } from "@/components/cr-icons";
import { createNewVersionAction } from "@/app/(app)/assets/actions";
import { MAX_UPLOAD_BYTES } from "@/lib/domain/asset";

export function UploadVersionDialog({
  assetId,
  assetType,
}: {
  assetId: string;
  assetType: string;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"file" | "url">("file");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const allowUrl = assetType === "design" || assetType === "wireframe";
  const effectiveSource = allowUrl ? source : "file";

  function handleSubmit(formData: FormData) {
    setError(null);
    // Client-side size check — matches the Server Action's MAX_UPLOAD_BYTES +
    // next.config.ts serverActions.bodySizeLimit. Prevents the Next
    // "Body exceeded ... limit" crash from ever reaching Sentry.
    const f = formData.get("file");
    if (f instanceof File && f.size > MAX_UPLOAD_BYTES) {
      setError(formatTooLarge(f.size));
      return;
    }
    startTransition(async () => {
      const result = await createNewVersionAction(null, formData);
      if (result.ok === false) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button type="button" className="cr-btn cr-btn-sm">
            <Upload size={14} /> Upload new version
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.01em",
            }}
          >
            Upload new version
          </DialogTitle>
          <DialogDescription style={{ color: "var(--cr-muted)" }}>
            The new version becomes the current one. Previous versions and
            their feedback stay visible in the history.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} encType="multipart/form-data">
          <input type="hidden" name="asset_id" value={assetId} />

          {allowUrl ? (
            <div className="mb-5">
              <div
                className="inline-flex gap-0.5 rounded-lg p-0.5 text-[13px]"
                style={{ border: "1px solid var(--cr-line-strong)" }}
              >
                <button
                  type="button"
                  onClick={() => setSource("file")}
                  className="rounded-md px-3 py-1 font-semibold"
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
              hint="Up to 25 MB."
              error={error && error.startsWith("File is") ? error : undefined}
            >
              <input
                id="file"
                name="file"
                type="file"
                accept={acceptFor(assetType)}
                required
                className="cr-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > MAX_UPLOAD_BYTES) {
                    setError(formatTooLarge(f.size));
                  } else if (error && error.startsWith("File is")) {
                    setError(null);
                  }
                }}
              />
            </FormField>
          ) : (
            <FormField label="External URL" name="external_url">
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
            hint="Optional. Plain text, max 500 characters. Shown to reviewers."
          >
            <textarea
              name="upload_note"
              rows={3}
              maxLength={500}
              className="cr-textarea"
            />
          </FormField>

          {error && !error.startsWith("File is") ? (
            <p
              className="mb-3 text-[13px] font-semibold"
              style={{ color: "var(--cr-destructive-ink)" }}
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              className="cr-btn cr-btn-ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="cr-btn cr-btn-constructive"
            >
              <Upload /> {pending ? "Uploading…" : "Upload version"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function acceptFor(type: string): string {
  switch (type) {
    case "image":
      return "image/png,image/jpeg,image/svg+xml";
    case "document":
      return "application/pdf";
    case "design":
    case "wireframe":
      return "image/png,image/jpeg";
    default:
      return "";
  }
}

function formatTooLarge(bytes: number): string {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  const capMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
  return `File is ${mb} MB — the upload limit is ${capMb} MB. Try compressing the image or splitting the PDF.`;
}
