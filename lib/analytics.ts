import "server-only";
import * as amplitude from "@amplitude/analytics-node";
import { serverEnv } from "@/lib/env.server";

// Analytics helper. Every event in the app flows through track(). Behaviors:
//   * dev / missing AMPLITUDE_API_KEY  → no-op (console.log in dev)
//   * prod with key                    → initialize SDK once + send
// This matches the brief's "gated behind a single track() helper that
// no-ops in dev" requirement.
//
// PRD §9 canonical event list (kept in sync with call sites):
//   admin   — signup, client_created, asset_uploaded, reminder_sent, project_completed
//   client  — magic_link_opened, decision_submitted, annotation_created, feedback_submitted
//   system  — digest_sent, email_delivered, email_bounced

export type EventName =
  | "signup"
  | "client_created"
  | "asset_uploaded"
  | "reminder_sent"
  | "project_completed"
  | "magic_link_opened"
  | "decision_submitted"
  | "annotation_created"
  | "feedback_submitted"
  | "digest_sent"
  | "email_delivered"
  | "email_bounced";

let initialized = false;
function ensureInit() {
  if (initialized) return true;
  const key = serverEnv.AMPLITUDE_API_KEY;
  if (!key) return false;
  amplitude.init(key, { flushIntervalMillis: 1000, flushQueueSize: 20 });
  initialized = true;
  return true;
}

export function track(
  event: EventName,
  params: {
    user_id?: string | null;
    workspace_id?: string | null;
    properties?: Record<string, string | number | boolean | null | undefined>;
  } = {},
): void {
  if (process.env.NODE_ENV !== "production") {
    // Dev no-op with a faint breadcrumb for debugging.
    console.log(`[analytics] ${event}`, params);
    return;
  }
  if (!ensureInit()) return;

  amplitude.track({
    event_type: event,
    user_id: params.user_id ?? undefined,
    event_properties: {
      ...params.properties,
      workspace_id: params.workspace_id ?? undefined,
    },
  });
}
