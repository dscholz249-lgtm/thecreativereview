import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Reviewers must have at least one client_reviewers row. Admins (who also
  // have accounts) can't stray into the review UI by mistake.
  const { data: reviewerRows } = await supabase
    .from("client_reviewers")
    .select("id")
    .eq("auth_user_id", user.id)
    .limit(1);
  if (!reviewerRows || reviewerRows.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <Link href="/review/my-reviews" className="text-sm font-semibold tracking-tight">
          Creative Review
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-600">Reviewing as {user.email}</span>
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
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}
