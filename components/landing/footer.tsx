import Link from "next/link";

export function LandingFooter() {
  return (
    <footer
      className="bg-[var(--cr-card)]"
      style={{ borderTop: "1px solid var(--cr-line)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="cr-logo-mark">CR</span>
            <span
              className="text-[16px] font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Creative Review
            </span>
          </div>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--cr-muted)" }}
          >
            A focused approval tool for freelancers and small teams.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-5 text-[14px] font-semibold"
          style={{ color: "var(--cr-muted)" }}
        >
          <Link href="#features" className="hover:text-[var(--cr-ink)]">
            Product
          </Link>
          <Link href="#pricing" className="hover:text-[var(--cr-ink)]">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-[var(--cr-ink)]">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-[var(--cr-ink)]">
            Sign up
          </Link>
        </nav>
      </div>
      <div
        className="px-6 py-4 sm:px-10"
        style={{
          borderTop: "1px solid var(--cr-line)",
          color: "var(--cr-muted)",
        }}
      >
        <p className="mx-auto max-w-6xl text-[12px]">
          © {new Date().getFullYear()} Creative Review.
        </p>
      </div>
    </footer>
  );
}
