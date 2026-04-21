import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="max-w-3xl">
        <p className="mb-4 inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600">
          For freelance designers and small creative teams
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
          Clean approvals. Click-to-pin feedback.
          <span className="block text-neutral-500">Nothing in between.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600">
          Creative Review is a focused review and approval tool for
          freelancers. Your clients approve cleanly or leave pinpoint
          feedback on images. No endless threads, no guesswork about
          whose sign-off counts.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg" })}
          >
            Start free
          </Link>
          <Link
            href="#features"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}
