import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Prices are display-only copy. The real amounts live in Stripe and flow
// through the checkout page — we never bill based on what's written here.
// If Stripe prices change, update this table so the marketing page stays
// honest; the checkout amount is the authoritative source.
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
      className="border-t border-neutral-200 bg-neutral-50"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Flat monthly pricing. Cancel anytime.
          </h2>
          <p className="mt-4 text-neutral-600">
            Start on any tier, switch freely from your billing page. No
            per-reviewer charges — your clients never need an account.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.plan}
              className={`flex h-full flex-col rounded-2xl border bg-white p-6 ${
                tier.featured
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              {tier.featured ? (
                <p className="mb-3 inline-flex w-fit rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">
                  Most popular
                </p>
              ) : null}
              <p className="text-sm font-semibold text-neutral-900">
                {tier.name}
              </p>
              <p className="mt-1 text-xs text-neutral-600">{tier.tagline}</p>
              <p className="mt-4">
                <span className="text-4xl font-semibold text-neutral-900">
                  {tier.price}
                </span>
                <span className="text-sm text-neutral-500">{tier.cadence}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-neutral-700">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 size-4 shrink-0 text-neutral-400"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 ${buttonVariants({
                  variant: tier.featured ? "default" : "outline",
                })}`}
              >
                Start with {tier.name}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          Self-hosted? Creative Review is open source under AGPL-3.0.
        </p>
      </div>
    </section>
  );
}
