import Link from "next/link";
import type { ReactNode } from "react";
import { CreativeReviewLogo } from "@/components/creative-review-logo";

// Split-panel shell for /login and /signup. Left panel is the marketing
// pitch, right panel is the form (passed as `children`). Top bar holds
// the CR logo mark only — no nav links in auth.

export function AuthSplitShell({
  pitchEyebrow,
  pitchHeading,
  pitchSubcopy,
  bullets,
  children,
}: {
  pitchEyebrow: string;
  pitchHeading: ReactNode;
  pitchSubcopy: string;
  bullets?: Array<{ dotColor: string; label: string }>;
  children: ReactNode;
}) {
  return (
    <>
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

      <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Pitch */}
        <div
          className="flex items-start px-6 py-16 sm:px-12 lg:border-r lg:py-20"
          style={{
            background: "var(--cr-paper)",
            borderColor: "var(--cr-line)",
          }}
        >
          <div className="w-full max-w-[480px]">
            <p className="cr-eyebrow mb-5">{pitchEyebrow}</p>
            <h1
              className="mb-5 text-[48px] sm:text-[64px]"
              style={{
                fontFamily: "var(--font-display), serif",
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              {pitchHeading}
            </h1>
            <p
              className="mb-8 text-[17px] leading-[1.55] sm:text-[18px]"
              style={{ color: "var(--cr-ink-2)" }}
            >
              {pitchSubcopy}
            </p>
            {bullets && bullets.length > 0 ? (
              <div
                className="flex flex-wrap items-center gap-5 text-[14px]"
                style={{ color: "var(--cr-muted)" }}
              >
                {bullets.map((b) => (
                  <span key={b.label} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2 rounded-full"
                      style={{ background: b.dotColor }}
                    />
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Form */}
        <div
          className="flex items-start justify-center px-6 py-16 sm:px-12 lg:py-20"
          style={{ background: "var(--cr-card)" }}
        >
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
    </>
  );
}
