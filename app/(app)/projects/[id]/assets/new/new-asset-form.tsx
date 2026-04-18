"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import {
  createAssetWithVersionAction,
  type ActionResult,
} from "@/app/(app)/assets/actions";

type AssetType = "image" | "document" | "design" | "wireframe";

export function NewAssetForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAssetWithVersionAction,
    null,
  );
  const [type, setType] = useState<AssetType>("image");
  const [source, setSource] = useState<"file" | "url">("file");

  const allowUrl = type === "design" || type === "wireframe";
  const effectiveSource = allowUrl ? source : "file";

  const err = state?.ok === false ? state : null;

  return (
    <Card>
      <CardContent className="py-6">
        <form action={action} className="flex flex-col gap-4" encType="multipart/form-data">
          <input type="hidden" name="project_id" value={projectId} />

          <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Homepage hero v1" required />
          </FormField>

          <FormField label="Type" name="type" error={err?.fieldErrors?.type}>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => setType(v as AssetType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image (PNG / JPEG / SVG)</SelectItem>
                <SelectItem value="document">Document (PDF)</SelectItem>
                <SelectItem value="design">Design (upload or external URL)</SelectItem>
                <SelectItem value="wireframe">Wireframe (upload or external URL)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

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
            <FormField
              label="File"
              name="file"
              hint="Up to 25 MB. Images (PNG/JPEG/SVG) support annotations; PDFs are text-only feedback."
              error={err?.fieldErrors?.file}
            >
              <Input
                id="file"
                name="file"
                type="file"
                accept={acceptFor(type)}
                required
              />
            </FormField>
          ) : (
            <FormField
              label="External URL"
              name="external_url"
              hint="Figma or similar. Reviewers will see the link and leave text feedback."
              error={err?.fieldErrors?.external_url}
            >
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
            hint="Optional. Plain text, max 500 characters. Shown to reviewers as context."
            error={err?.fieldErrors?.upload_note}
          >
            <Textarea id="upload_note" name="upload_note" rows={3} maxLength={500} />
          </FormField>

          <FormField
            label="Deadline"
            name="deadline"
            hint="Optional."
            error={err?.fieldErrors?.deadline}
          >
            <Input id="deadline" name="deadline" type="date" />
          </FormField>

          {err?.error ? <p className="text-xs text-red-600">{err.error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload asset"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
