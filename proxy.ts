import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Next.js 16 proxy (replaces middleware.ts). Two responsibilities:
//   1. Refresh the Supabase session cookie on every request per Supabase
//      SSR requirements.
//   2. Forward x-pathname into the request headers so the (app) layout
//      can paywall lapsed trials without bouncing the user off /billing
//      in an infinite redirect loop. Route protection itself still lives
//      in (app)/layout.tsx via redirect().
export default async function proxy(request: NextRequest) {
  // Setting on request.headers (not response.headers) makes it readable
  // via `headers()` in Server Components further down the request.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Required per Supabase SSR: refreshes expired tokens, writes updated cookies.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
