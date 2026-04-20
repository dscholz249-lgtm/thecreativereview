import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation / magic link callback.
// Supabase redirects here (no query-string ?next so the URL matches the
// whitelist without wildcards). We exchange the code for a session, then
// sniff whether the authenticated user is a client_reviewer or an admin
// and route accordingly.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const fallback = url.searchParams.get("next");

  if (!code) return NextResponse.redirect(new URL("/login", url.origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // If a trusted `next` was explicitly passed by our own flow, honor it.
  // Otherwise route based on role: reviewers → /review/my-reviews,
  // admins → /dashboard, unknown → landing.
  if (fallback && fallback.startsWith("/")) {
    return NextResponse.redirect(new URL(fallback, url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

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

  if (reviewer) return NextResponse.redirect(new URL("/review/my-reviews", url.origin));
  if (admin) return NextResponse.redirect(new URL("/dashboard", url.origin));
  return NextResponse.redirect(new URL("/", url.origin));
}
