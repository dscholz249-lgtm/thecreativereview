import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { serverEnv } from "@/lib/env.server";

// Resend wrapper. Every transactional email in the app routes through this so
// we have one place to add: dev no-op mode, reply-to defaults, Sentry breadcrumbs.
//
// Returns `{ id }` on success or `{ error }` on failure. Server actions decide
// whether to surface the error to the user or just log it.
//
// Milestone 3 uses this for the reviewer-invite email. Milestone 4 adds the
// new-asset, decision-submitted, project-complete, digest, and reminder emails.

let _client: Resend | null = null;
function client() {
  if (_client) return _client;
  _client = new Resend(serverEnv.RESEND_API_KEY ?? "");
  return _client;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}): Promise<SendEmailResult> {
  if (!serverEnv.RESEND_API_KEY) {
    // Dev mode: log and skip. Prevents noisy failures in local dev without
    // a Resend key configured.
    console.log(
      `[email] would send to ${Array.isArray(params.to) ? params.to.join(", ") : params.to}: ${params.subject}`,
    );
    return { ok: true, id: "dev-noop" };
  }

  const { data, error } = await client().emails.send({
    from: serverEnv.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    react: params.react,
    replyTo: params.replyTo,
  });

  if (error) return { ok: false, error: error.message ?? "unknown email error" };
  if (!data) return { ok: false, error: "no id returned from Resend" };
  return { ok: true, id: data.id };
}
