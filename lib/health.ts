import "server-only";

import { createAdminClient } from "@/server/admin-client";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

// Reusable health checks — consumed by both the /api/health endpoint
// (for monitoring + Railway deploy healthcheck) and instrumentation.ts
// (which logs findings once at boot so misconfig shows up in Railway
// logs without waiting for the first broken invite).
//
// Distinguishes two severities:
//   - critical: the container is unhealthy. `/api/health` returns 503,
//     the boot log emits an error, deploys should fail.
//   - warning:  the app will run, but reviewers/admins will hit a
//     degraded flow (e.g. Resend sandbox only delivers to the account
//     owner). Logged but non-blocking.

export type HealthCheck = {
  name: string;
  ok: boolean;
  critical: boolean;
  message?: string;
};

export type HealthReport = {
  ok: boolean;
  criticalFailures: number;
  warnings: number;
  checks: HealthCheck[];
};

export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];

  // --- env vars (critical) ------------------------------------------------
  checks.push(check("env.NEXT_PUBLIC_SUPABASE_URL", !!env.NEXT_PUBLIC_SUPABASE_URL, true));
  checks.push(check("env.NEXT_PUBLIC_SUPABASE_ANON_KEY", !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY, true));
  checks.push(check("env.SUPABASE_SERVICE_ROLE_KEY", !!serverEnv.SUPABASE_SERVICE_ROLE_KEY, true));
  checks.push(
    check(
      "env.NEXT_PUBLIC_APP_URL",
      isValidUrl(env.NEXT_PUBLIC_APP_URL),
      true,
      env.NEXT_PUBLIC_APP_URL,
    ),
  );

  // --- APP_URL sanity (warning) -------------------------------------------
  if (process.env.NODE_ENV === "production") {
    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
    if (/localhost|127\.0\.0\.1/.test(appUrl)) {
      checks.push(warn("app.url.production_localhost", `NEXT_PUBLIC_APP_URL points at ${appUrl} in production — magic links will route to your laptop.`));
    }
  }

  // --- Email (warning) ----------------------------------------------------
  if (!serverEnv.RESEND_API_KEY) {
    checks.push(warn("email.resend_key", "RESEND_API_KEY is unset. sendEmail runs in dev-noop mode — invite and decision emails will NOT deliver."));
  }
  const emailFrom = serverEnv.EMAIL_FROM ?? "";
  if (/onboarding@resend\.dev/i.test(emailFrom)) {
    checks.push(warn("email.sandbox_sender", `EMAIL_FROM uses Resend's sandbox sender (${emailFrom}). Resend will only deliver to the email on your Resend account — reviewers get nothing. Verify your domain and set EMAIL_FROM to an address on it.`));
  }

  // --- Stripe config consistency (warning) --------------------------------
  const stripeKey = serverEnv.STRIPE_SECRET_KEY;
  const stripeHook = serverEnv.STRIPE_WEBHOOK_SECRET;
  if (stripeKey && !stripeHook) {
    checks.push(warn("stripe.webhook_secret_missing", "STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not — the webhook route will 500 on any inbound event."));
  }
  if (!stripeKey && stripeHook) {
    checks.push(warn("stripe.secret_missing", "STRIPE_WEBHOOK_SECRET is set but STRIPE_SECRET_KEY is not — the webhook handler can't retrieve subscriptions."));
  }
  if (stripeKey) {
    const mode = stripeKey.startsWith("sk_live_") ? "live" : "test";
    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
    const looksProd = /thecreativereview\.app/i.test(appUrl) && !/localhost|127\.0\.0\.1/.test(appUrl);
    if (looksProd && mode === "test") {
      checks.push(warn("stripe.test_mode_on_prod_host", `STRIPE_SECRET_KEY is a test-mode key on a production-looking APP_URL (${appUrl}). Real billing won't work until you swap to sk_live_.`));
    }
  }

  // --- Supabase reachability (critical) -----------------------------------
  if (serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        checks.push({
          name: "supabase.reachable",
          ok: false,
          critical: true,
          message: `Service-role listUsers failed: ${error.message}`,
        });
      } else {
        checks.push({ name: "supabase.reachable", ok: true, critical: true });
      }
    } catch (err) {
      checks.push({
        name: "supabase.reachable",
        ok: false,
        critical: true,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const criticalFailures = checks.filter((c) => c.critical && !c.ok).length;
  const warnings = checks.filter((c) => !c.critical && !c.ok).length;
  return {
    ok: criticalFailures === 0,
    criticalFailures,
    warnings,
    checks,
  };
}

function check(name: string, ok: boolean, critical: boolean, detail?: string): HealthCheck {
  return {
    name,
    ok,
    critical,
    message: ok ? detail : detail ? `Missing or invalid: ${detail}` : "Missing or invalid.",
  };
}

function warn(name: string, message: string): HealthCheck {
  return { name, ok: false, critical: false, message };
}

function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
