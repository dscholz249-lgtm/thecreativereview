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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { createNewVersionAction } from "@/app/(app)/assets/actions";

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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Upload new version
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload new version</DialogTitle>
          <DialogDescription>
            The new version becomes the current one. Previous versions and their
            feedback stay visible in the history.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} encType="multipart/form-data" className="flex flex-col gap-4">
          <input type="hidden" name="asset_id" value={assetId} />

          {allowUrl ? (
            <div className="inline-flex rounded-md border p-0.5 text-xs self-start">
              <button
                type="button"
                onClick={() => setSource("file")}
                className={`rounded px-3 py-1 ${source === "file" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setSource("url")}
                className={`rounded px-3 py-1 ${source === "url" ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
              >
                External URL
              </button>
            </div>
          ) : null}

          {effectiveSource === "file" ? (
            <FormField label="File" name="file" hint="Up to 25 MB.">
              <Input
                id="file"
                name="file"
                type="file"
                accept={acceptFor(assetType)}
                required
              />
            </FormField>
          ) : (
            <FormField label="External URL" name="external_url">
              <Input
                id="external_url"
                name="external_url"
                type="url"
                placeholder="https://figma.com/..."
                required
              />
            </FormField>
          )}

          <FormField
            label="Upload note"
            name="upload_note"
            hint="Optional. Plain text, max 500 characters. Shown to reviewers."
          >
            <Textarea name="upload_note" rows={3} maxLength={500} />
          </FormField>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload version"}
            </Button>
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
