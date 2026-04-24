"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
import { ArrowRight } from "@/components/landing/icons";

// Root-segment error boundary. Next.js renders this when a Server
// Component / Route Handler / Server Action throws. Runs client-side
// because it needs access to the `reset` callback (retry without a full
// navigation). Reports to Sentry on mount so runtime failures show up
// in our dashboards alongside the request errors captured by
// instrumentation.ts.

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <header
        className="bg-[var(--cr-card)]"
        style={{ borderBottom: "2px solid var(--cr-ink)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
          <Link href="/" aria-label="The Creative Review — home">
            <CreativeReviewLogo fontSize={16} />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
        <p
          className="cr-mono mb-5"
          style={{
            color: "var(--cr-destructive-ink)",
            fontSize: 14,
            letterSpacing: "0.04em",
          }}
        >
          500 · something broke
        </p>
        <h1
          className="cr-display"
          style={{
            fontFamily: "var(--font-display), serif",
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          That didn&apos;t load.
        </h1>
        <p
          className="mt-5 text-[17px] leading-[1.55]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          Something went wrong on our end. We&apos;ve logged it and are
          taking a look. Try the page again — if it keeps failing, the
          details below will help us figure out what happened.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={reset}
            className="cr-btn cr-btn-primary cr-btn-lg"
          >
            Try again <ArrowRight size={16} />
          </button>
          <Link href="/" className="cr-btn cr-btn-lg cr-btn-ghost">
            Back to home
          </Link>
        </div>

        {error.digest ? (
          <p
            className="cr-mono mt-9 text-[12px]"
            style={{ color: "var(--cr-muted)" }}
          >
            Ref: {error.digest}
          </p>
        ) : null}
      </main>
    </div>
  );
}
