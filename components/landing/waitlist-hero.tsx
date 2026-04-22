import { WaitlistForm } from "./waitlist-form";

// Hero with an inline waitlist form. Same display hierarchy as the live
// landing's hero (big slab headline → subcopy → CTA) but the CTA pair
// is replaced with the waitlist form itself so interested visitors can
// drop their details without scrolling.
export function WaitlistHero() {
  return (
    <section
      id="get-early-access"
      className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10 sm:pt-20 sm:pb-16"
    >
      <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="cr-eyebrow mb-5 inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ background: "var(--cr-accent-green)" }}
            />
            Coming soon · limited beta
          </p>
          <h1
            className="text-[48px] leading-[0.95] tracking-[-0.035em] sm:text-[72px] lg:text-[88px] lg:leading-[0.92]"
            style={{ fontFamily: "var(--font-display), serif", fontWeight: 800 }}
          >
            Ship the work.
            <br />
            <span style={{ color: "var(--cr-muted)" }}>Skip the</span> email
            <br />
            thread.
          </h1>
          <p
            className="mt-7 max-w-[560px] text-[18px] leading-[1.5] sm:text-[20px]"
            style={{ color: "var(--cr-ink-2)" }}
          >
            The Creative Review is a focused review-and-approval tool for
            freelance designers and small agencies. Single link per asset,
            pin-accurate feedback, approvals that actually mean something.
            We&apos;re opening access in waves — drop your details and we&apos;ll
            reach out.
          </p>
        </div>

        <div
          className="cr-card-raised p-6 sm:p-7"
          style={{ background: "var(--cr-card)" }}
        >
          <p className="cr-eyebrow mb-3">Be the first to know</p>
          <h2
            className="mb-5"
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Get early access.
          </h2>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
