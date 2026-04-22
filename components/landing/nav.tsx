import Link from "next/link";
import { CreativeReviewLogo } from "@/components/creative-review-logo";

// Marketing top nav. 2px ink bottom rule + the filmstrip-check ticket
// glyph paired with the slab wordmark is the signature — don't change
// the lockup without updating the in-app chrome to match.
export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-10 bg-[var(--cr-card)]"
      style={{ borderBottom: "2px solid var(--cr-ink)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
        <Link href="/" aria-label="The Creative Review — home">
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
            href="#agencies"
            className="hidden text-[15px] font-semibold text-[var(--cr-muted)] hover:text-[var(--cr-ink)] md:inline"
          >
            For agencies
          </Link>
          <div className="flex items-center gap-2 sm:ml-3">
            <Link href="/login" className="cr-btn cr-btn-sm cr-btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="cr-btn cr-btn-sm cr-btn-primary">
              Start free
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
