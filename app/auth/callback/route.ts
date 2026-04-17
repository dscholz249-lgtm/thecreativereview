import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation / magic link callback.
// Supabase redirects here with a `code` parameter; exchanging it finalizes the
// session, after which the admin already has their workspace + profile (set at
// signup) or the reviewer will have theirs set on first magic-link click.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) return NextResponse.redirect(new URL("/login", url.origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
