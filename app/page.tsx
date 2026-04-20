import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role-aware routing for authenticated users.
  if (user) {
    const [{ data: reviewer }, { data: admin }] = await Promise.all([
      supabase
        .from("client_reviewers")
        .select("id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (reviewer) redirect("/review/my-reviews");
    if (admin) redirect("/dashboard");
    // Authenticated but neither — fall through to the landing page.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Creative Review
        </h1>
        <p className="mt-4 text-neutral-600">
          Clean approvals. Click-to-pin feedback. Nothing in between.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
