"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin-client";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";

// Kept in sync with app/admin-invite/[token]/actions.ts +
// components/password-setup-modal.tsx.
const NEEDS_PASSWORD_COOKIE = "cr_needs_password";

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

  // We pre-confirm the email via the service-role admin API instead of
  // going through supabase.auth.signUp(), which mints a confirmation
  // link the user has to click in their inbox. The link flow is fragile
  // (deliverability, link-scanner pre-clicks, mobile mail clients
  // stripping params) and slows hosted signup to a crawl. The trade-off
  // is no email verification at signup; the trial → card requirement
  // gives us downstream proof the email belongs to a real person before
  // any money moves.
  const admin = createAdminClient();
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
  if (createError || !createData.user) {
    const msg = createError?.message ?? "Signup failed";
    if (
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered") ||
      msg.toLowerCase().includes("exists")
    ) {
      return {
        ok: false,
        error: "That email is already registered. Try logging in instead.",
      };
    }
    return { ok: false, error: msg };
  }
  const userId = createData.user.id;

  // Bootstrap workspace + admin_profile via service role. Required because no
  // admin_profile exists yet, so RLS can't express this insert. See
  // server/admin-client.ts for the list of sanctioned service-role call sites.
  //
  // Hosted signups land on plan='solo' with a 7-day trial — never 'oss'.
  // 'oss' is reserved for self-hosted forks of the AGPL repo. The (app)
  // layout enforces the paywall once trial_ends_at is in the past and
  // there's no active stripe_subscription_id.
  const trialEndsAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({
      name: parsed.data.workspace_name,
      plan: "solo",
      trial_ends_at: trialEndsAt,
    })
    .select("id")
    .single();
  if (wsError || !workspace) {
    // Roll back the auth user so the email isn't permanently blocked
    // from re-signup. Best-effort — log + bubble the original error.
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: wsError?.message ?? "Failed to create workspace" };
  }

  const { error: profileError } = await admin.from("admin_profiles").insert({
    user_id: userId,
    workspace_id: workspace.id,
    role: "owner",
  });
  if (profileError) {
    // Same rollback pattern: drop the workspace and the auth user so a
    // retry can succeed cleanly.
    await admin.from("workspaces").delete().eq("id", workspace.id);
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  track("signup", {
    user_id: userId,
    workspace_id: workspace.id,
    properties: { confirmed: true },
  });

  // Drop them straight into a session via the public client so cookies
  // get written to the response. signInWithPassword is fine here because
  // we just minted the user with a known password seconds ago.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) {
    // The account is fully usable — they can hit /login to recover. Log
    // the unexpected failure so we can investigate if it ever happens.
    console.error("[signup] sign-in after createUser failed", signInError);
    return {
      ok: false,
      error: "Account created. Please log in to finish.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
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

// Send a one-time sign-in link. Doubles as password recovery — an admin
// who's lost their password hits "Forgot?" on /login, requests a magic
// link, and the /auth/callback route consumes it the same way reviewer
// invites are consumed.
//
// shouldCreateUser=false so a forgotten-password flow can't spawn orphan
// auth.users rows for typo'd emails (those users would land without an
// admin_profile and be stuck on the landing page). Supabase returns a
// discriminable error when the email isn't on file; to avoid account
// enumeration we show the generic "check your email" confirmation
// regardless.
export async function sendMagicLinkAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = z
    .object({ email: z.string().trim().email() })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: "That email doesn't look right." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  // Swallow the "user not registered" / "signup disabled" errors so we
  // don't leak whether an email has an account. Let genuinely different
  // errors (rate limit, Supabase down) through so the user knows to retry.
  if (error) {
    const msg = error.message.toLowerCase();
    const isEnumerationLeak =
      msg.includes("not registered") ||
      msg.includes("signups not allowed") ||
      msg.includes("signup not allowed") ||
      msg.includes("user not found");
    if (!isEnumerationLeak) {
      return { ok: false, error: error.message };
    }
  }

  return {
    ok: true,
    message:
      "If an account exists for that email, we sent a sign-in link. Check your inbox.",
  };
}

const SetPasswordInput = z.object({
  password: z.string().min(8, "At least 8 characters").max(72),
});

// Invited admins land in the app via a Supabase magic link — they don't
// have a password set, so we prompt them via the PasswordSetupModal.
// This action does the update + clears the "needs password" cookie.
export async function setPasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = SetPasswordInput.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid password",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  const jar = await cookies();
  jar.delete(NEEDS_PASSWORD_COOKIE);

  revalidatePath("/", "layout");
  return { ok: true, message: "Password set. You can sign in with it next time." };
}

// "Skip for now" on the setup modal — clears the cookie so the user
// isn't nagged every page load. They can still sign back in via magic
// link and they can set a password later from the profile menu (TODO).
export async function dismissPasswordSetupAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(NEEDS_PASSWORD_COOKIE);
  revalidatePath("/", "layout");
}
