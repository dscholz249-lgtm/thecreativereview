/**
 * Fires a test waitlist signup against whatever Supabase + Resend your
 * .env.local points at. Useful for eyeballing the row shape in the
 * notifications table and seeing whether Resend accepts the send under
 * your current EMAIL_FROM / RESEND_API_KEY config.
 *
 *   npm run test:waitlist
 *
 * Writes a row with kind='waitlist_signup'. The payload flags it as a
 * dev test (source='script', name includes '[dev]') so you can tell it
 * apart from real signups.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { Resend } from "resend";

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString();
  const testRow = {
    name: `Test User [dev ${stamp.slice(11, 19)}]`,
    email: "test+waitlist@dev.local",
    agency: "Dev Studio",
  };

  console.log("Submitting test signup:", testRow);
  const admin = createClient<Database>(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Durable record first — matches app/welcome/actions.ts order.
  const { data: inserted, error: dbError } = await admin
    .from("notifications")
    .insert({
      kind: "waitlist_signup",
      recipient_email: "info@thecreativereview.app",
      payload_json: {
        name: testRow.name,
        email: testRow.email,
        agency: testRow.agency,
        submitted_at: stamp,
        source: "script",
      } as unknown as Json,
      sent_at: null,
    })
    .select("id, created_at, payload_json, sent_at")
    .single();

  if (dbError) {
    console.error("DB insert failed:", dbError);
    process.exit(1);
  }
  console.log("\nInserted notifications row:");
  console.log(JSON.stringify(inserted, null, 2));

  // 2. Email attempt — only fires if RESEND_API_KEY is set.
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(
      "\n(RESEND_API_KEY unset — skipping email send. Row stays with sent_at=null.)",
    );
    return;
  }

  const emailFrom =
    process.env.EMAIL_FROM ??
    "Creative Review <onboarding@resend.dev>";
  const resend = new Resend(resendKey);

  const body =
    `<h2>New waitlist signup (dev test)</h2>` +
    `<p><strong>Name:</strong> ${testRow.name}</p>` +
    `<p><strong>Email:</strong> ${testRow.email}</p>` +
    `<p><strong>Agency:</strong> ${testRow.agency}</p>` +
    `<p>Submitted via scripts/test-waitlist.ts at ${stamp}</p>`;

  const { data: sendData, error: sendError } = await resend.emails.send({
    from: emailFrom,
    to: "info@thecreativereview.app",
    subject: `Waitlist signup: ${testRow.name}`,
    replyTo: testRow.email,
    html: body,
  });

  if (sendError) {
    console.error("\nResend rejected the send:");
    console.error(sendError);
    console.log(
      "\nNotifications row stays with sent_at=null — the data is still safe.",
    );
    return;
  }

  console.log("\nResend accepted the send:");
  console.log(sendData);

  await admin
    .from("notifications")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", inserted!.id);
  console.log("Stamped sent_at on the notifications row.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
