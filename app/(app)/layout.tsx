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

  const workspaceName =
    (profile?.workspaces as { name: string } | null)?.name ?? "Workspace";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <AppNav workspaceName={workspaceName} userEmail={user.email ?? ""} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
    </div>
  );
}
