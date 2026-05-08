"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CreateClientSchema, UpdateClientSchema } from "@/lib/domain/client";
import { PLAN_LIMITS, formatLimit } from "@/lib/plans";
import { PLAN_LABELS } from "@/lib/stripe/config";
import {
  CLIENT_LOGO_BUCKET,
  CLIENT_LOGO_MAX_BYTES,
} from "@/lib/supabase/storage";
import { track } from "@/lib/analytics";

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

// Pulls the optional logo file off a FormData and validates type + size.
// Returns null when no file was attached (logos are optional). Returns
// a descriptive error string when the file is invalid so the caller can
// surface it as a fieldErrors.logo entry.
function readLogoFile(
  formData: FormData,
): { file: File } | { error: string } | null {
  const raw = formData.get("logo");
  if (!(raw instanceof File) || raw.size === 0) return null;
  if (!ALLOWED_LOGO_MIME.has(raw.type)) {
    return { error: "Logo must be a PNG, JPG, WebP, or SVG image." };
  }
  if (raw.size > CLIENT_LOGO_MAX_BYTES) {
    return { error: "Logo must be under 1 MB." };
  }
  return { file: raw };
}

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

async function getWorkspaceId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("admin_profiles")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

export async function createClientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = CreateClientSchema.safeParse({
    name: formData.get("name"),
    primary_email: formData.get("primary_email"),
    // logo_url is computed from an upload below — never accepted from
    // the client.
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const logoCheck = readLogoFile(formData);
  if (logoCheck && "error" in logoCheck) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: { logo: logoCheck.error },
    };
  }

  const workspace_id = await getWorkspaceId();
  if (!workspace_id) return { ok: false, error: "No workspace found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Plan-tier client cap. Counted against non-archived clients only, so
  // archiving a client frees a slot. RLS scopes both reads to this
  // workspace, so the count is workspace-local.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspace_id)
    .maybeSingle();
  const plan = workspace?.plan ?? "oss";
  const cap = PLAN_LIMITS[plan].activeClients;
  if (Number.isFinite(cap)) {
    const { count: activeCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("archived", false);
    if ((activeCount ?? 0) >= cap) {
      return {
        ok: false,
        error: `You're at your ${PLAN_LABELS[plan]} plan's limit of ${formatLimit(cap)} active clients. Archive one, or upgrade your plan from Billing to add more.`,
      };
    }
  }

  // Pre-mint the client_id so the storage path can include it. Storage
  // upload happens before the row insert; if the insert later fails we
  // best-effort clean up the uploaded object so we don't leave orphaned
  // logo files lying around.
  const clientId = randomUUID();
  let logo_url: string | null = null;
  let uploadedPath: string | null = null;

  if (logoCheck && "file" in logoCheck) {
    const file = logoCheck.file;
    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      mimeToExt(file.type);
    const path = `${workspace_id}/${clientId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(CLIENT_LOGO_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
    if (uploadError) {
      return {
        ok: false,
        error: `Logo upload failed: ${uploadError.message}`,
      };
    }
    uploadedPath = path;
    const { data: urlData } = supabase.storage
      .from(CLIENT_LOGO_BUCKET)
      .getPublicUrl(path);
    logo_url = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, id: clientId, logo_url, workspace_id })
    .select("id")
    .single();
  if (error || !data) {
    if (uploadedPath) {
      await supabase.storage.from(CLIENT_LOGO_BUCKET).remove([uploadedPath]);
    }
    return { ok: false, error: error?.message ?? "Insert failed." };
  }

  track("client_created", {
    user_id: user?.id ?? null,
    workspace_id,
    properties: { client_id: data.id, has_logo: Boolean(logo_url) },
  });

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

// Fallback when File.name has no extension (rare but possible — e.g.
// drag-drops from clipboard managers). Keeps the path well-formed
// without sniffing the bytes.
function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "img";
  }
}

export async function updateClientAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = UpdateClientSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    primary_email: formData.get("primary_email") || undefined,
    logo_url: formData.get("logo_url") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(rest).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function archiveClientAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("clients").update({ archived: true }).eq("id", id);
  revalidatePath("/clients");
  redirect("/clients");
}
