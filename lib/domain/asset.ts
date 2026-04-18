import { z } from "zod";
import { OptionalUploadNoteSchema } from "./upload-note";

const AssetTypeSchema = z.enum(["image", "document", "design", "wireframe"]);

// Create the asset row only. Version is created in a second step (server
// action handles both in the same request).
export const CreateAssetSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  type: AssetTypeSchema,
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

// Uploading a new version of an existing asset. Either a file (storage_path)
// or an external URL, never both. The storage helper derives storage_path.
export const CreateVersionSchema = z.object({
  asset_id: z.string().uuid(),
  upload_note: OptionalUploadNoteSchema,
  // Discriminated source: caller provides ONE of these, server validates.
  external_url: z.string().trim().url().optional(),
  storage_path: z.string().trim().min(1).optional(),
}).refine(
  (v) => Boolean(v.external_url) !== Boolean(v.storage_path),
  {
    message: "Exactly one of external_url or storage_path must be provided.",
    path: ["storage_path"],
  },
);

// Allowed upload MIME types — matches PRD 7.3 per asset type.
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;
export const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB per PRD 7.3

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;
