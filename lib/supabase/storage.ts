import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Single source of truth for bucket names + path layouts used by the
// Supabase Storage RLS policies (supabase/migrations/20260417120000_initial_schema.sql
// + 20260508120000_client_logos_bucket.sql).
// Path layout for both: {workspace_id}/.../filename — RLS keys off the
// first path segment.
export const ASSET_BUCKET = "asset-files";
export const CLIENT_LOGO_BUCKET = "client-logos";

// Cap client-logo uploads at 1 MB. Logos are decorative (not the
// primary content of the app) so we err small; the form also restricts
// to image/* via the accept attribute.
export const CLIENT_LOGO_MAX_BYTES = 1 * 1024 * 1024;

export function buildStoragePath(params: {
  workspace_id: string;
  asset_id: string;
  version_id: string;
  filename: string;
}): string {
  const safeName = params.filename
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-120);
  return `${params.workspace_id}/${params.asset_id}/${params.version_id}/${safeName}`;
}

// Issues a short-lived signed URL for a stored object. TTL short so a leaked
// URL expires fast; pages re-request a fresh one on render.
const DEFAULT_TTL_SECONDS = 5 * 60;

export async function createSignedUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ASSET_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
