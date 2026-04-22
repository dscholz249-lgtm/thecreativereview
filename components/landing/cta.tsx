import Link from "next/link";
import { ArrowRight } from "./icons";

export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
      <div
        className="rounded-[16px] px-8 py-14 text-center sm:px-16 sm:py-20"
        style={{
          background: "var(--cr-ink)",
          boxShadow: "3px 3px 0 var(--cr-accent-green), 0 0 0 1.5px var(--cr-ink)",
        }}
      >
        <h2
          className="text-white"
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 48,
            letterSpacing: "-0.02em",
            lineHeight: 1.02,
          }}
        >
          Ship cleaner approvals this week.
        </h2>
        <p
          className="mx-auto mt-5 max-w-[520px] text-[17px]"
          style={{ color: "var(--cr-paper-2)" }}
        >
          Spin up a workspace in under a minute. Invite your client, upload
          an asset, watch the feedback come back sharp.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="cr-btn cr-btn-lg"
            style={{
              background: "var(--cr-card)",
              color: "var(--cr-ink)",
              borderColor: "var(--cr-card)",
              boxShadow: "2px 2px 0 var(--cr-accent-green)",
            }}
          >
            Start free <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="cr-link text-[15px] text-white"
            style={{ textDecorationColor: "var(--cr-accent-green)" }}
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </section>
  );
}
