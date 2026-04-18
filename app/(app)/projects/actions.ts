"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CreateProjectSchema, UpdateProjectSchema } from "@/lib/domain/project";

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

export async function createProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = CreateProjectSchema.safeParse({
    client_id: formData.get("client_id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(parsed.data)
    .select("id, client_id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath(`/clients/${data.client_id}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = UpdateProjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    deadline: formData.get("deadline") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(rest).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${id}`);
}

export async function archiveProjectAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("projects").update({ status: "archived" }).eq("id", id);
  if (project) revalidatePath(`/clients/${project.client_id}`);
  revalidatePath("/dashboard");
  redirect(project ? `/clients/${project.client_id}` : "/clients");
}
