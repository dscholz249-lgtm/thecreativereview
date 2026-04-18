import { z } from "zod";

// Upload note contract (PRD 7.3):
//   - plain text, max 500 characters
//   - server-side sanitized (never rendered as HTML)
//   - strip HTML tags, normalize whitespace
//
// Called from any server action that writes to asset_versions.upload_note.
// The CHECK constraint on the column enforces the length; this function is
// the sanitization + UX-validation layer.

const MAX_LENGTH = 500;

const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

export function sanitizeUploadNote(input: string | null | undefined): string | null {
  if (input == null) return null;
  const stripped = String(input)
    .replace(HTML_COMMENT, "")
    .replace(HTML_TAG, "")
    // Normalize every whitespace run to a single space, trim ends.
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length === 0 ? null : stripped;
}

export const UploadNoteSchema = z
  .string()
  .max(MAX_LENGTH, `Upload note must be ${MAX_LENGTH} characters or fewer`)
  .transform((v) => sanitizeUploadNote(v))
  .pipe(z.string().max(MAX_LENGTH).nullable());

export const OptionalUploadNoteSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => sanitizeUploadNote(v ?? null));
