import Link from "next/link";
import { ArrowRight } from "./icons";

// Live-marketing hero. The mock product-preview card used to live here
// but moved into the How-It-Works section (where it anchors the 4-step
// reviewer flow better than floating below the CTA buttons).
export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10 sm:pt-24 sm:pb-16">
      <p className="cr-eyebrow mb-5 inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full"
          style={{ background: "var(--cr-accent-green)" }}
        />
        Client review · built for studios
      </p>
      <h1
        className="text-[56px] leading-[0.95] tracking-[-0.035em] sm:text-[88px] lg:text-[104px] lg:leading-[0.92]"
        style={{ fontFamily: "var(--font-display), serif", fontWeight: 800 }}
      >
        Ship the work.
        <br />
        <span style={{ color: "var(--cr-muted)" }}>Skip the</span> email thread.
      </h1>
      <p
        className="mt-8 max-w-[640px] text-[18px] leading-[1.5] sm:text-[20px]"
        style={{ color: "var(--cr-ink-2)" }}
      >
        Creative Review gives agencies a single link per asset, pin-accurate
        client feedback, clean version history, and approvals that actually
        mean something.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3.5">
        <Link href="/signup" className="cr-btn cr-btn-primary cr-btn-lg">
          Start a free studio <ArrowRight size={16} />
        </Link>
        <Link href="#features" className="cr-btn cr-btn-lg cr-btn-ghost">
          See a sample review →
        </Link>
      </div>
    </section>
  );
}
