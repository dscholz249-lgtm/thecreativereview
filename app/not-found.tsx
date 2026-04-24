import Link from "next/link";
import type { Metadata } from "next";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
import { ArrowRight } from "@/components/landing/icons";

// Global 404. Next.js renders this for any route that hits notFound() or
// doesn't match a segment. Matches the visual language of the /invite and
// /share failure screens — slab headline, cr-surface wrapper, a single
// clear way out. Link points at `/` so the role-aware root page sends
// logged-in users back to their dashboard / inbox; anonymous visitors
// land on the marketing page.

export const metadata: Metadata = {
  title: "The Creative Review — page not found",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
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
            color: "var(--cr-muted)",
            fontSize: 14,
            letterSpacing: "0.04em",
          }}
        >
          404 · not found
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
          Nothing here.
        </h1>
        <p
          className="mt-5 text-[17px] leading-[1.55]"
          style={{ color: "var(--cr-ink-2)" }}
        >
          The link you followed is either broken or points at something
          that&apos;s been archived, renamed, or deleted. If you got here
          from an email, the asset may have moved to a new version — check
          your inbox for the latest link.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3.5">
          <Link href="/" className="cr-btn cr-btn-primary cr-btn-lg">
            Back to home <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="cr-btn cr-btn-lg cr-btn-ghost">
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
