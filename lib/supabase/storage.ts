import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Single source of truth for the bucket name + path layout used by the
// Supabase Storage RLS policies (supabase/migrations/20260417120000_initial_schema.sql).
// Path layout: {bucket}/{workspace_id}/{asset_id}/{version_id}/{filename}
// The workspace_id must be the first path segment — RLS keys off it.
export const ASSET_BUCKET = "asset-files";

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
