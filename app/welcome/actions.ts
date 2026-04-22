"use server";

import { z } from "zod";
import { createAdminClient } from "@/server/admin-client";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";
import type { Json } from "@/lib/database.types";
import WaitlistSignupEmail from "@/emails/waitlist-signup";

// Waitlist signup. Pre-launch visitors drop their details at /welcome; we
// email info@thecreativereview.app so Dan sees it in his inbox, AND we
// insert an audit row into `notifications` so the list of signups survives
// email failures. The notifications table is service-role-only — reviewers
// and admins never see these rows.

const INBOX = "info@thecreativereview.app";

const WaitlistInput = z.object({
  name: z.string().trim().min(1, "Tell us who you are.").max(120),
  email: z
    .string()
    .trim()
    .email("That email doesn't look right.")
    .max(200),
  agency: z.string().trim().max(200).optional(),
});

export type WaitlistActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function submitWaitlistAction(
  _prev: WaitlistActionResult | null,
  formData: FormData,
): Promise<WaitlistActionResult> {
  const parsed = WaitlistInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    agency: formData.get("agency") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  }
  const { name, email, agency } = parsed.data;

  // Durable first — if Resend is down or EMAIL_FROM isn't set, we still
  // have the signup in Supabase to fall back on.
  const admin = createAdminClient();
  const { error: dbError } = await admin.from("notifications").insert({
    kind: "waitlist_signup",
    recipient_email: INBOX,
    payload_json: {
      name,
      email,
      agency: agency ?? null,
      submitted_at: new Date().toISOString(),
    } as unknown as Json,
    sent_at: null,
  });
  if (dbError) {
    console.error("[waitlist] DB insert failed", dbError);
    return {
      ok: false,
      error: "Couldn't save your signup — try again in a moment.",
    };
  }

  // Best-effort email. Reply-To is set to the signup email so Dan can
  // respond directly from his inbox, once the thecreativereview.app
  // receiving MX is live.
  const sendResult = await sendEmail({
    to: INBOX,
    subject: `Waitlist signup: ${name}${agency ? ` (${agency})` : ""}`,
    replyTo: email,
    react: WaitlistSignupEmail({ name, email, agency: agency ?? null }),
  });

  if (sendResult.ok) {
    await admin
      .from("notifications")
      .update({ sent_at: new Date().toISOString() })
      .eq("kind", "waitlist_signup")
      .contains("payload_json", { email });
  } else {
    console.error("[waitlist] Resend send failed", sendResult.error);
    // Don't leak the provider error to the user — the signup is safe in DB.
  }

  track("signup", {
    properties: {
      source: "waitlist",
      has_agency: Boolean(agency),
    },
  });

  return {
    ok: true,
    message:
      "Thanks! You're on the list. We'll be in touch the moment we launch.",
  };
}
