import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { PasswordSetupModal } from "@/components/password-setup-modal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("name, workspaces(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  // Role gate: if there's no admin_profile, the user is not an admin and
  // should never see the admin shell. Reviewers go to their inbox; anyone
  // else (shouldn't happen) back to the landing.
  if (!profile) {
    const { data: reviewer } = await supabase
      .from("client_reviewers")
      .select("id")
      .eq("auth_user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (reviewer) redirect("/review/my-reviews");
    redirect("/");
  }

  const workspaceName =
    (profile?.workspaces as { name: string } | null)?.name ?? "Workspace";

  // Invited admins land here with a magic-link session but no password.
  // The admin-invite redemption action sets this cookie; the setup modal
  // reads it on first render and clears it via its own action.
  const jar = await cookies();
  const needsPassword = jar.get("cr_needs_password")?.value === "1";

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <AppNav workspaceName={workspaceName} userEmail={user.email ?? ""} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-9 sm:px-10 sm:py-10">
        {children}
      </main>
      {needsPassword ? <PasswordSetupModal open /> : null}
    </div>
  );
}
