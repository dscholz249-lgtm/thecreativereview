// Pricing tiers. The design bundle didn't include a pricing table — we're
// keeping the existing tier structure but restyling it in the new language.
// Claude Design can rework the card treatment in a follow-up; the tier
// data is the source of truth regardless.
//
// Prices are display-only. Stripe is the authoritative source of billed
// amounts — keep these numbers in sync if Stripe pricing changes.
const TIERS = [
  {
    name: "Solo",
    plan: "solo",
    price: "$5",
    cadence: "/mo",
    tagline: "One freelancer, a handful of clients.",
    features: [
      "1 admin seat",
      "Up to 5 active clients",
      "Unlimited assets + versions",
      "25 MB uploads",
      "Click-to-pin annotations",
    ],
    featured: false,
  },
  {
    name: "Studio",
    plan: "studio",
    price: "$10",
    cadence: "/mo",
    tagline: "Small teams juggling a dozen brands.",
    features: [
      "3 admin seats",
      "Up to 25 active clients",
      "Everything in Solo",
      "Weekly digest reminders",
      "Custom workspace branding",
    ],
    featured: true,
  },
  {
    name: "Agency",
    plan: "agency",
    price: "$20",
    cadence: "/mo",
    tagline: "Agencies where volume is the whole point.",
    features: [
      "10 admin seats",
      "Unlimited clients",
      "Everything in Studio",
      "Priority support",
      "Custom domain + white-label",
    ],
    featured: false,
  },
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="border-y py-16 sm:py-20"
      style={{ borderColor: "var(--cr-line)", background: "var(--cr-paper-2)" }}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mb-10 max-w-2xl">
          <p className="cr-eyebrow mb-4">Pricing</p>
          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Flat monthly pricing.
            <br />
            <span style={{ color: "var(--cr-muted)" }}>Cancel anytime.</span>
          </h2>
          <p
            className="mt-4 text-[17px]"
            style={{ color: "var(--cr-ink-2)" }}
          >
            Start on any tier, switch freely from your billing page. No
            per-reviewer charges — your clients never need an account.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.plan}
              className={tier.featured ? "cr-card-raised p-7" : "cr-card p-7"}
            >
              <div className="flex items-center gap-2">
                <p
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 800,
                    fontSize: 22,
                  }}
                >
                  {tier.name}
                </p>
                {tier.featured ? (
                  <span
                    className="cr-badge"
                    style={{
                      background: "var(--cr-ink)",
                      color: "white",
                      borderColor: "var(--cr-ink)",
                    }}
                  >
                    Most popular
                  </span>
                ) : null}
              </div>
              <p
                className="mt-1 text-[14px]"
                style={{ color: "var(--cr-muted)" }}
              >
                {tier.tagline}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 800,
                    fontSize: 48,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  {tier.price}
                </span>
                <span
                  className="text-[15px]"
                  style={{ color: "var(--cr-muted)" }}
                >
                  {tier.cadence}
                </span>
              </div>
              <ul className="mt-6 flex flex-col gap-2 text-[15px]">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckGlyph />
                    <span style={{ color: "var(--cr-ink)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              {/* Pricing cards intentionally have no "Start with X" CTA until
                  the live Stripe price IDs + secret key are swapped on
                  Railway. Post-launch we'll re-add the button; until then
                  the waitlist hero/cta are the only signup paths. */}
            </div>
          ))}
        </div>

        <p
          className="mt-10 text-center text-[13px]"
          style={{ color: "var(--cr-muted)" }}
        >
          Self-hosted? Creative Review is open source under AGPL-3.0.
        </p>
      </div>
    </section>
  );
}

function CheckGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--cr-constructive)", flexShrink: 0, marginTop: 2 }}
    >
      <path d="M3 8.5 7 12l6-8" />
    </svg>
  );
}
