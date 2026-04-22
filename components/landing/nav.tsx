import Link from "next/link";

// Marketing top nav. 2px ink bottom rule + the logo-mark CR badge with the
// accent-green hard offset shadow is the signature — don't drop either
// without a matching update in the app chrome.
export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-10 bg-[var(--cr-card)]"
      style={{ borderBottom: "2px solid var(--cr-ink)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="cr-logo-mark">CR</span>
          <span
            className="text-[20px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Creative Review
          </span>
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
