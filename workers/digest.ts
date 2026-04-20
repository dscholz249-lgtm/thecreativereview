// Railway cron worker — weekly digest.
//
// Runs hourly. On each run:
//   1. Find every reviewer for whom "now" is Friday between 12:00 and 12:59
//      in their configured timezone (client_reviewers.timezone, default UTC).
//   2. Skip reviewers that already received a digest in the last 20 hours
//      (safety net for clock drift / retries).
//   3. For each, load pending items (non-archived assets with status='pending'
//      across their clients) and send the weekly digest email.
//
// This is a service-role worker — there's no user JWT. It lives in /workers,
// not /server, so it's obvious at a glance that the web app doesn't import
// it and it doesn't ship inside the Next.js bundle.
//
// Railway is expected to invoke this on an hourly cron (0 * * * *). Local
// dev runs via `npm run worker:digest`.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { render } from "@react-email/render";
import React from "react";
import type { Database } from "@/lib/database.types";
import WeeklyDigestEmail from "@/emails/weekly-digest";

type ReviewerRow = Database["public"]["Tables"]["client_reviewers"]["Row"];

const env = requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
]);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const emailFrom =
  process.env.EMAIL_FROM ?? "Creative Review <onboarding@resend.dev>";

const db = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main(): Promise<void> {
  const now = new Date();
  console.log(`[digest] tick @ ${now.toISOString()}`);

  const { data: reviewers, error } = await db
    .from("client_reviewers")
    .select("id, email, name, timezone, client_id");
  if (error) {
    console.error("[digest] load reviewers failed", error);
    process.exitCode = 1;
    return;
  }
  if (!reviewers || reviewers.length === 0) return;

  const candidates = reviewers.filter((r) =>
    isFridayNoonLocal(now, r.timezone),
  );
  if (candidates.length === 0) {
    console.log("[digest] no reviewers in the Friday-noon window");
    return;
  }

  const cutoffIso = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  for (const reviewer of candidates) {
    const already = await alreadyDigestedRecently(reviewer.email, cutoffIso);
    if (already) continue;

    const items = await loadPendingItemsForReviewer(reviewer);
    const ok = await sendDigest(reviewer, items);
    if (ok) sent += 1;
  }

  console.log(
    `[digest] candidates=${candidates.length} sent=${sent} (total reviewers=${reviewers.length})`,
  );
}

async function alreadyDigestedRecently(
  email: string,
  sinceIso: string,
): Promise<boolean> {
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("kind", "weekly_digest")
    .eq("recipient_email", email)
    .gte("created_at", sinceIso)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function loadPendingItemsForReviewer(
  reviewer: Pick<ReviewerRow, "client_id">,
): Promise<Array<{ assetName: string; projectName: string; deadline: string | null }>> {
  // All non-archived, status='pending' assets under the reviewer's single
  // client. If we expand to reviewers-across-multiple-clients, this becomes a
  // two-step query — current schema keys reviewers on one client.
  const { data } = await db
    .from("assets")
    .select(
      "name, deadline, projects!inner ( name, client_id )",
    )
    .eq("archived", false)
    .eq("status", "pending")
    .eq("projects.client_id", reviewer.client_id)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (!data) return [];
  return data.map((row) => {
    const project = row.projects as unknown as { name: string } | null;
    return {
      assetName: row.name,
      projectName: project?.name ?? "Project",
      deadline: row.deadline,
    };
  });
}

async function sendDigest(
  reviewer: Pick<ReviewerRow, "id" | "email" | "name">,
  items: Array<{ assetName: string; projectName: string; deadline: string | null }>,
): Promise<boolean> {
  const inboxUrl = `${env.NEXT_PUBLIC_APP_URL}/review/my-reviews`;
  const subject =
    items.length === 0
      ? "You're all caught up — weekly digest"
      : `Weekly digest: ${items.length} asset${items.length === 1 ? "" : "s"} waiting`;

  const reactEl = React.createElement(WeeklyDigestEmail, {
    reviewerName: reviewer.name,
    items,
    inboxUrl,
  });

  let ok = false;
  let errorMessage: string | null = null;

  if (!resend) {
    console.log(
      `[digest] (dev no-op) would send to ${reviewer.email}: ${subject}`,
    );
    ok = true;
  } else {
    const html = await render(reactEl);
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: reviewer.email,
      subject,
      html,
    });
    if (error || !data) {
      errorMessage = error?.message ?? "no id returned";
      console.error(`[digest] resend failed for ${reviewer.email}`, error);
    } else {
      ok = true;
    }
  }

  await db.from("notifications").insert({
    kind: "weekly_digest",
    recipient_email: reviewer.email,
    payload_json: {
      reviewer_id: reviewer.id,
      item_count: items.length,
      error: errorMessage,
    } as unknown as Database["public"]["Tables"]["notifications"]["Insert"]["payload_json"],
    sent_at: ok ? new Date().toISOString() : null,
  });

  if (ok) {
    // Worker runs outside the Next.js app — can't import the track() helper
    // without dragging the whole lib/env.server chain. Post directly to
    // Amplitude HTTP v2. No-op when AMPLITUDE_API_KEY is unset.
    await postAmplitudeEvent("digest_sent", reviewer.email, {
      item_count: items.length,
    });
  }

  return ok;
}

async function postAmplitudeEvent(
  event: string,
  userId: string,
  properties: Record<string, string | number | boolean | null>,
): Promise<void> {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  if (!apiKey) return;
  try {
    await fetch("https://api2.amplitude.com/2/httpapi", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        events: [{ event_type: event, user_id: userId, event_properties: properties }],
      }),
    });
  } catch (err) {
    console.warn("[digest] amplitude post failed", err);
  }
}

function isFridayNoonLocal(now: Date, timezone: string | null): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const hour = hourStr === undefined ? NaN : Number(hourStr);
    return weekday === "Fri" && hour === 12;
  } catch {
    // Invalid tz string — fall through to UTC.
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours();
    return utcDay === 5 && utcHour === 12;
  }
}

function requireEnv<T extends readonly string[]>(keys: T): Record<T[number], string> {
  const out = {} as Record<T[number], string>;
  for (const key of keys) {
    const v = process.env[key];
    if (!v) {
      console.error(`[digest] missing required env var: ${key}`);
      process.exit(2);
    }
    (out as Record<string, string>)[key] = v;
  }
  return out;
}

main().catch((err) => {
  console.error("[digest] uncaught", err);
  process.exitCode = 1;
});
