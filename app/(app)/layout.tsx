import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

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

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <AppNav workspaceName={workspaceName} userEmail={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
    </div>
  );
}
