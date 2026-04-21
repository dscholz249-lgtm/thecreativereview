import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Sticky top nav. Marketing-only — the in-app nav (components/app-nav) is
// a different component because logged-in admins see a workspace dropdown +
// internal links, not marketing anchors.
export function LandingNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Creative Review
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="#features"
            className="hidden px-2 py-1 text-neutral-600 hover:text-neutral-900 sm:inline"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="hidden px-2 py-1 text-neutral-600 hover:text-neutral-900 sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="px-2 py-1 text-neutral-600 hover:text-neutral-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: "sm" })}
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
