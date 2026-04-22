import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
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
    <div className="cr-surface flex min-h-screen flex-col">
      <header
        className="bg-[var(--cr-card)]"
        style={{ borderBottom: "2px solid var(--cr-ink)" }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 sm:px-10">
          <Link
            href="/review/my-reviews"
            aria-label="My reviews"
          >
            <CreativeReviewLogo fontSize={16} />
          </Link>
          <div className="flex items-center gap-4 text-[14px]">
            <span style={{ color: "var(--cr-muted)" }}>
              Reviewing as{" "}
              <span style={{ color: "var(--cr-ink)", fontWeight: 600 }}>
                {user.email}
              </span>
            </span>
            <form action={logout}>
              <button type="submit" className="cr-link">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 py-9 sm:px-10 sm:py-10">
        {children}
      </main>
    </div>
  );
}
