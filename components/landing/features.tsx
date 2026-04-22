// Three-card feature row. Each card gets a numbered black square with the
// green offset shadow — same treatment as the CR logo mark. Keep the set
// to three; the hero product-preview + pricing sections already cover the
// "show don't tell" need and four cards starts to feel like filler.

const features = [
  {
    heading: "One link, done.",
    body: "Send a single URL per asset. Clients approve in two clicks — no account required.",
  },
  {
    heading: "Pins, not paragraphs.",
    body: "Visual feedback lives on the pixel it refers to. Version history keeps everything in order.",
  },
  {
    heading: "Approvals that count.",
    body: "Timestamped decisions, a decision ledger, exportable for your records.",
  },
];

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.heading} className="cr-card p-7">
            <div
              className="mb-4 flex size-10 items-center justify-center rounded-lg text-white"
              style={{
                background: "var(--cr-ink)",
                boxShadow: "2px 2px 0 var(--cr-accent-green)",
                fontFamily: "var(--font-display), serif",
                fontWeight: 800,
              }}
            >
              {i + 1}
            </div>
            <h3
              className="mb-2.5"
              style={{
                fontFamily: "var(--font-display), serif",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.01em",
              }}
            >
              {f.heading}
            </h3>
            <p
              className="text-[16px] leading-[1.5]"
              style={{ color: "var(--cr-ink-2)" }}
            >
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
