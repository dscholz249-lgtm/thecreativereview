"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CreateClientSchema, UpdateClientSchema } from "@/lib/domain/client";
import { track } from "@/lib/analytics";

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
    logo_url: formData.get("logo_url") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const workspace_id = await getWorkspaceId();
  if (!workspace_id) return { ok: false, error: "No workspace found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.data, workspace_id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  track("client_created", {
    user_id: user?.id ?? null,
    workspace_id,
    properties: { client_id: data.id },
  });

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
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
