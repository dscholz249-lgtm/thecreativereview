"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";

// Setting the session via a Server Action guarantees the auth cookies are
// written via Next's cookie API (which goes out as Set-Cookie headers on the
// action response). Doing it with the browser client leaves a race between
// document.cookie writes and the next page navigation — the server-side
// render of `/` occasionally ran before the cookies were visible, so the
// user landed on the unauthenticated landing instead of their inbox.

const TokenSchema = z.string().min(1);

export type SessionResult = { ok: true } | { ok: false; error: string };

export async function finishMagicLinkAction(
  access_token: string,
  refresh_token: string,
): Promise<SessionResult> {
  const aT = TokenSchema.safeParse(access_token);
  const rT = TokenSchema.safeParse(refresh_token);
  if (!aT.success || !rT.success) {
    return { ok: false, error: "Missing session tokens." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: aT.data,
    refresh_token: rT.data,
  });
  if (error) return { ok: false, error: error.message };
  track("magic_link_opened", {
    user_id: data.user?.id ?? null,
    properties: { flow: "implicit" },
  });
  return { ok: true };
}

export async function exchangePkceCodeAction(
  code: string,
): Promise<SessionResult> {
  const parsed = TokenSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: "Missing code." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.data);
  if (error) return { ok: false, error: error.message };
  track("magic_link_opened", {
    user_id: data.user?.id ?? null,
    properties: { flow: "pkce" },
  });
  return { ok: true };
}
