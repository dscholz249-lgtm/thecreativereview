import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // Fire-and-forget startup health check — logs to Railway on boot so
    // misconfigurations (EMAIL_FROM sandbox, wrong APP_URL, unreachable
    // Supabase) surface immediately instead of in a failed invite email.
    // Don't await — the checks hit Supabase and we don't want to block
    // boot on DB round-trip latency.
    const { runHealthChecks } = await import("./lib/health");
    void runHealthChecks()
      .then((report) => {
        const criticals = report.checks.filter((c) => c.critical && !c.ok);
        const warnings = report.checks.filter((c) => !c.critical && !c.ok);
        if (criticals.length > 0) {
          console.error(
            `[health] ${criticals.length} critical failure(s) at boot:`,
            criticals,
          );
        }
        for (const w of warnings) {
          console.warn(`[health] ${w.name}: ${w.message}`);
        }
        if (criticals.length === 0 && warnings.length === 0) {
          console.log(
            `[health] ${report.checks.filter((c) => c.ok).length} check(s) passing.`,
          );
        }
      })
      .catch((err) => {
        console.error("[health] check threw unexpectedly", err);
      });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
