"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";

const SignupInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  workspace_name: z.string().trim().min(1).max(120),
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function signup(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = SignupInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    workspace_name: formData.get("workspace_name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Signup did not return a user" };

  // Bootstrap workspace + admin_profile via service role. Required because no
  // admin_profile exists yet, so RLS can't express this insert. See
  // server/admin-client.ts for the list of sanctioned service-role call sites.
  const admin = createAdminClient();
  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({ name: parsed.data.workspace_name })
    .select("id")
    .single();
  if (wsError || !workspace) {
    return { ok: false, error: wsError?.message ?? "Failed to create workspace" };
  }

  const { error: profileError } = await admin.from("admin_profiles").insert({
    user_id: data.user.id,
    workspace_id: workspace.id,
    role: "owner",
  });
  if (profileError) {
    // Best-effort cleanup; workspace will be orphaned until a cleanup job runs.
    await admin.from("workspaces").delete().eq("id", workspace.id);
    return { ok: false, error: profileError.message };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  return {
    ok: true,
    message:
      "Check your email for a confirmation link to finish creating your account.",
  };
}

export async function login(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = LoginInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid email or password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
