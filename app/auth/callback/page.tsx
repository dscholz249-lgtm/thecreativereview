"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Handles BOTH Supabase auth flows returned by /auth/v1/verify:
//
//   * Implicit flow  — tokens arrive in the URL **hash** (#access_token=...,
//     refresh_token=..., expires_at=...). This is what admin.generateLink
//     produces for magiclink / invite / recovery. Hash fragments never reach
//     the server, so this must be a client page, not a route handler.
//
//   * PKCE flow      — tokens arrive via `?code=...` in the query. The
//     client SDK's exchangeCodeForSession finishes the flow.
//
// After the session is set, navigates to "/" which does role-based routing
// (reviewer → /review/my-reviews, admin → /dashboard).
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function handle() {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const queryParams = new URLSearchParams(window.location.search);

      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      const queryError = queryParams.get("error_description") ?? queryParams.get("error");
      if (hashError || queryError) {
        setError(hashError ?? queryError ?? "Unknown auth error.");
        return;
      }

      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setError(error.message);
          return;
        }
        // history.replaceState clears the hash so the tokens aren't in the
        // Referer when we navigate away.
        window.history.replaceState(null, "", "/auth/callback");
        router.replace("/");
        return;
      }

      const code = queryParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        router.replace("/");
        return;
      }

      setError(
        "No auth tokens found in the URL. The link may have expired — ask for a new invite.",
      );
    }

    handle();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold">Couldn&apos;t sign you in</h1>
            <p className="mt-2 text-sm text-neutral-600">{error}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-neutral-900 underline"
            >
              Back to login
            </Link>
          </>
        ) : (
          <p className="text-sm text-neutral-600">Signing you in…</p>
        )}
      </div>
    </main>
  );
}
