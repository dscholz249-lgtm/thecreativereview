import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";

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
    .select("name, workspace_id, workspaces(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  const workspaceName =
    (profile?.workspaces as { name: string } | null)?.name ?? "Workspace";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
        <Link href="/dashboard" className="font-semibold">
          Creative Review
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-600">{workspaceName}</span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-600">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
