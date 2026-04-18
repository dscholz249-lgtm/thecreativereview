"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CreateAssetSchema } from "@/lib/domain/asset";
import { sanitizeUploadNote } from "@/lib/domain/upload-note";
import { ASSET_BUCKET, buildStoragePath } from "@/lib/supabase/storage";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function getCurrentAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { supabase, userId: user.id, workspaceId: profile.workspace_id };
}

// Creates the asset row + v1 asset_version in one request. The caller
// provides a file (for image/document/wireframe/design-upload) OR an
// external URL (for design/wireframe-link). Exactly one of the two.
export async function createAssetWithVersionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsedAsset = CreateAssetSchema.safeParse({
    project_id: formData.get("project_id"),
    name: formData.get("name"),
    type: formData.get("type"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsedAsset.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsedAsset.error) };
  }

  const upload_note = sanitizeUploadNote(formData.get("upload_note") as string | null);
  const externalUrlRaw = (formData.get("external_url") as string | null)?.trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const hasUrl = Boolean(externalUrlRaw);

  if (hasFile === hasUrl) {
    return {
      ok: false,
      error: "Provide a file OR an external URL, not both (and not neither).",
    };
  }
  if (hasFile && (file as File).size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds 25 MB." };
  }

  const ctx = await getCurrentAdminContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  const { supabase, userId, workspaceId } = ctx;

  const assetId = randomUUID();
  const versionId = randomUUID();

  let storagePath: string | null = null;
  let externalUrl: string | null = null;

  if (hasFile) {
    const f = file as File;
    storagePath = buildStoragePath({
      workspace_id: workspaceId,
      asset_id: assetId,
      version_id: versionId,
      filename: f.name,
    });
    const { error: uploadError } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(storagePath, f, { contentType: f.type, upsert: false });
    if (uploadError) {
      return { ok: false, error: `Upload failed: ${uploadError.message}` };
    }
  } else {
    externalUrl = externalUrlRaw!;
  }

  const { error: assetError } = await supabase.from("assets").insert({
    id: assetId,
    project_id: parsedAsset.data.project_id,
    name: parsedAsset.data.name,
    type: parsedAsset.data.type,
    deadline: parsedAsset.data.deadline ?? null,
    status: "pending",
  });
  if (assetError) {
    // Best-effort cleanup of the uploaded file so we don't orphan it.
    if (storagePath) await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
    return { ok: false, error: assetError.message };
  }

  const { error: versionError } = await supabase.from("asset_versions").insert({
    id: versionId,
    asset_id: assetId,
    version_number: 1,
    storage_path: storagePath,
    external_url: externalUrl,
    upload_note,
    uploaded_by: userId,
  });
  if (versionError) {
    await supabase.from("assets").delete().eq("id", assetId);
    if (storagePath) await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
    return { ok: false, error: versionError.message };
  }

  await supabase
    .from("assets")
    .update({ current_version_id: versionId })
    .eq("id", assetId);

  revalidatePath(`/projects/${parsedAsset.data.project_id}`);
  revalidatePath("/dashboard");
  redirect(`/assets/${assetId}`);
}

// Uploads a new version of an existing asset. Resets the asset's status
// to 'pending' and bumps current_version_id. Previous versions remain
// immutable and visible in the version history.
export async function createNewVersionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const assetId = z.string().uuid().safeParse(formData.get("asset_id"));
  if (!assetId.success) return { ok: false, error: "Invalid asset id." };

  const upload_note = sanitizeUploadNote(formData.get("upload_note") as string | null);
  const externalUrlRaw = (formData.get("external_url") as string | null)?.trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const hasUrl = Boolean(externalUrlRaw);
  if (hasFile === hasUrl) {
    return { ok: false, error: "Provide a file OR an external URL, not both." };
  }
  if (hasFile && (file as File).size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds 25 MB." };
  }

  const ctx = await getCurrentAdminContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  const { supabase, userId, workspaceId } = ctx;

  // Next version number = max + 1 for this asset.
  const { data: latest } = await supabase
    .from("asset_versions")
    .select("version_number")
    .eq("asset_id", assetId.data)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersionNumber = (latest?.version_number ?? 0) + 1;

  const versionId = randomUUID();
  let storagePath: string | null = null;
  let externalUrl: string | null = null;

  if (hasFile) {
    const f = file as File;
    storagePath = buildStoragePath({
      workspace_id: workspaceId,
      asset_id: assetId.data,
      version_id: versionId,
      filename: f.name,
    });
    const { error: uploadError } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(storagePath, f, { contentType: f.type, upsert: false });
    if (uploadError) {
      return { ok: false, error: `Upload failed: ${uploadError.message}` };
    }
  } else {
    externalUrl = externalUrlRaw!;
  }

  const { error: versionError } = await supabase.from("asset_versions").insert({
    id: versionId,
    asset_id: assetId.data,
    version_number: nextVersionNumber,
    storage_path: storagePath,
    external_url: externalUrl,
    upload_note,
    uploaded_by: userId,
  });
  if (versionError) {
    if (storagePath) await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
    return { ok: false, error: versionError.message };
  }

  await supabase
    .from("assets")
    .update({ current_version_id: versionId, status: "pending" })
    .eq("id", assetId.data);

  revalidatePath(`/assets/${assetId.data}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveAssetAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("assets")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("assets").update({ archived: true }).eq("id", id);
  if (asset) revalidatePath(`/projects/${asset.project_id}`);
  revalidatePath("/dashboard");
  redirect(asset ? `/projects/${asset.project_id}` : "/dashboard");
}
