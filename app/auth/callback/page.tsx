"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { finishMagicLinkAction, exchangePkceCodeAction } from "./actions";

// Handles BOTH Supabase auth flows returned by /auth/v1/verify:
//
//   * Implicit flow  — tokens arrive in the URL **hash** (#access_token=...,
//     refresh_token=..., expires_at=...). This is what admin.generateLink
//     produces for magiclink / invite / recovery. Hash fragments never reach
//     the server, so this must be a client page, not a route handler.
//
//   * PKCE flow      — tokens arrive via `?code=...` in the query. The
//     server's exchangeCodeForSession finishes the flow.
//
// The session is set via Server Actions so the Supabase auth cookies are
// written with Next's cookie API (Set-Cookie headers on the action
// response) — guaranteed to be present on the very next navigation. After
// success, we force a full-page load so the landing `/` render starts from
// a clean cookie state, then role-routes the user.
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const queryParams = new URLSearchParams(window.location.search);

      const authError =
        hashParams.get("error_description") ??
        hashParams.get("error") ??
        queryParams.get("error_description") ??
        queryParams.get("error");
      if (authError) {
        setError(authError);
        return;
      }

      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const result = await finishMagicLinkAction(access_token, refresh_token);
        if (result.ok === false) {
          setError(result.error);
          return;
        }
        // history.replaceState wipes the hash so the tokens don't land in
        // the Referer of the next request. assign() then forces a full
        // reload so the role-aware redirect on `/` sees the fresh cookies.
        window.history.replaceState(null, "", "/auth/callback");
        window.location.assign("/");
        return;
      }

      const code = queryParams.get("code");
      if (code) {
        const result = await exchangePkceCodeAction(code);
        if (result.ok === false) {
          setError(result.error);
          return;
        }
        window.location.assign("/");
        return;
      }

      setError(
        "No auth tokens found in the URL. The link may have expired — ask for a new invite.",
      );
    }

    handle();
  }, []);

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
