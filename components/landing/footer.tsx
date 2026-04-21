import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            Creative Review
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            A focused approval tool for freelancers and small teams.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-neutral-600">
          <Link href="#features" className="hover:text-neutral-900">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-neutral-900">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-neutral-900">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-neutral-900">
            Sign up
          </Link>
        </nav>
      </div>
      <div className="border-t border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-neutral-500">
          © {new Date().getFullYear()} Creative Review.
        </div>
      </div>
    </footer>
  );
}
