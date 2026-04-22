import { WaitlistForm } from "./waitlist-form";

// Final CTA band. Dark surface with the waitlist form rendered in its
// `dark` variant (paper-toned inputs, card-colored submit with the green
// hard-offset shadow) so there's one more obvious place to sign up
// after reading the features/pricing sections.
export function WaitlistCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
      <div
        className="rounded-[16px] px-8 py-14 sm:px-14 sm:py-16"
        style={{
          background: "var(--cr-ink)",
          boxShadow: "3px 3px 0 var(--cr-accent-green), 0 0 0 1.5px var(--cr-ink)",
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2
              className="text-white"
              style={{
                fontFamily: "var(--font-display), serif",
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: "-0.02em",
                lineHeight: 1.02,
              }}
            >
              Launching in early 2026.
            </h2>
            <p
              className="mt-5 text-[17px]"
              style={{ color: "var(--cr-paper-2)" }}
            >
              We&apos;re inviting small cohorts of freelance designers and
              studios as we polish the last rough edges. Leave your
              details — we&apos;ll send a single email when you&apos;re in.
            </p>
          </div>
          <div>
            <WaitlistForm variant="dark" />
          </div>
        </div>
      </div>
    </section>
  );
}
