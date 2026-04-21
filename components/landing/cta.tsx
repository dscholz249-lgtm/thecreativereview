import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="rounded-3xl border border-neutral-200 bg-neutral-900 p-10 text-center sm:p-16">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ship cleaner approvals this week.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-neutral-300">
          Spin up a workspace in under a minute. Invite your client, upload
          an asset, watch the feedback come back sharp.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg" })}
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-white hover:underline"
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </section>
  );
}
