// How It Works — reviewer flow, four steps. Lives between features and
// pricing on both the live marketing and waitlist pages; reuses the
// numbered ink square with green offset shadow from the features cards
// so visual grammar is consistent.

const STEPS = [
  {
    heading: "Your designer sends one link.",
    body: "An asset goes up; you get an email with a single button. No account to create, no password to forget — the link is the login.",
  },
  {
    heading: "Open the asset in your browser.",
    body: "You see the artwork full-size with any note the team wrote for you. No threads, no chat — just the file and two clear next steps.",
  },
  {
    heading: "Approve cleanly, or pin what needs to change.",
    body: "Approve and the work is done. Request changes and the annotator unlocks — click anywhere on an image to drop a numbered pin with a comment.",
  },
  {
    heading: "Your team gets notified instantly.",
    body: "Decisions are timestamped and archived. Every version of the asset stays in history with its decisions attached, so nothing gets lost when you iterate.",
  },
];

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y py-16 sm:py-20"
      style={{ borderColor: "var(--cr-line)" }}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mb-10 max-w-2xl">
          <p className="cr-eyebrow mb-4">How it works</p>
          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Review in two clicks.
            <br />
            <span style={{ color: "var(--cr-muted)" }}>Built for busy clients.</span>
          </h2>
          <p
            className="mt-4 text-[17px]"
            style={{ color: "var(--cr-ink-2)" }}
          >
            The reviewer side is the whole product. If your clients can&apos;t
            approve in under a minute, nothing else matters.
          </p>
        </div>

        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <li
              key={step.heading}
              className="cr-card flex gap-5 p-7"
              style={{ listStyle: "none" }}
            >
              <div
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-lg text-white"
                style={{
                  background: "var(--cr-ink)",
                  boxShadow: "2px 2px 0 var(--cr-accent-green)",
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 800,
                  fontSize: 20,
                  letterSpacing: "-0.02em",
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  {step.heading}
                </h3>
                <p
                  className="mt-2 text-[16px] leading-[1.5]"
                  style={{ color: "var(--cr-ink-2)" }}
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
