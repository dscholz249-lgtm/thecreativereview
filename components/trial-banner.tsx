import Link from "next/link";

// Thin status bar shown above the app shell while a workspace is on
// the 7-day trial. Switches to a destructive tone in the last 48h so
// the urgency is visible without nagging earlier users every render.
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 2;
  return (
    <div
      className="px-6 py-2 text-[13px] sm:px-10"
      style={{
        background: urgent ? "var(--cr-destructive-soft)" : "var(--cr-paper)",
        borderBottom: "1px solid var(--cr-line)",
        color: urgent ? "var(--cr-destructive-ink)" : "var(--cr-ink-2)",
      }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
        <span>
          <span style={{ fontWeight: 700 }}>
            {daysLeft === 1
              ? "1 day left"
              : `${daysLeft} days left`}
          </span>{" "}
          on your free trial.
          {urgent
            ? " Subscribe to keep the lights on."
            : " Pick a plan whenever you're ready — no rush."}
        </span>
        <Link
          href="/billing"
          className="cr-link"
          style={{
            color: urgent ? "var(--cr-destructive-ink)" : "var(--cr-ink)",
            fontWeight: 700,
          }}
        >
          Subscribe →
        </Link>
      </div>
    </div>
  );
}
