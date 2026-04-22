import Link from "next/link";
import { CreativeReviewLogo } from "@/components/creative-review-logo";

// Waitlist variant of the marketing nav. Replaces "Start free" with a
// scroll-link to the hero form and drops the in-app login link so
// pre-launch visitors aren't sent to a screen that won't accept them.
export function WaitlistNav() {
  return (
    <header
      className="sticky top-0 z-10 bg-[var(--cr-card)]"
      style={{ borderBottom: "2px solid var(--cr-ink)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
        <Link href="/welcome" aria-label="The Creative Review — home">
          <CreativeReviewLogo fontSize={16} />
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          <Link
            href="#features"
            className="hidden text-[15px] font-semibold text-[var(--cr-muted)] hover:text-[var(--cr-ink)] sm:inline"
          >
            Product
          </Link>
          <Link
            href="#pricing"
            className="hidden text-[15px] font-semibold text-[var(--cr-muted)] hover:text-[var(--cr-ink)] sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="#get-early-access"
            className="cr-btn cr-btn-sm cr-btn-primary"
          >
            Get early access
          </Link>
        </nav>
      </div>
    </header>
  );
}
