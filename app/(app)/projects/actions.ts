"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CreateProjectSchema, UpdateProjectSchema } from "@/lib/domain/project";
import { sendManualReminder } from "@/lib/notifications";

export type ActionResult =
  | { ok: true; message?: string }
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

// Manual reminder — admin clicks "Nudge reviewers" on project detail page.
// The 24h rate limit is enforced inside sendManualReminder via an atomic
// UPDATE on projects.last_reminded_at, so two concurrent clicks (or a
// crafted FormData replay) cannot both win.
export async function sendManualReminderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = z
    .object({ project_id: z.string().uuid() })
    .safeParse({ project_id: formData.get("project_id") });
  if (!parsed.success) return { ok: false, error: "Invalid project id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // RLS check — project must be visible to this admin in their workspace.
  // If the select returns nothing, the admin is not entitled to this project.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: "Project not found in your workspace." };
  }

  const result = await sendManualReminder({
    project_id: parsed.data.project_id,
    requester_user_id: user.id,
  });
  revalidatePath(`/projects/${parsed.data.project_id}`);
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    message: `Reminder sent to ${result.sent} reviewer${result.sent === 1 ? "" : "s"}.`,
  };
}
