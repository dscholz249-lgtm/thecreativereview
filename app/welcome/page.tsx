import type { Metadata } from "next";
import { WaitlistNav } from "@/components/landing/waitlist-nav";
import { WaitlistHero } from "@/components/landing/waitlist-hero";
import { WaitlistCta } from "@/components/landing/waitlist-cta";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingFooter } from "@/components/landing/footer";

// Pre-launch "get notified" page. Duplicates the marketing composition at
// `/` but swaps the signup CTAs for a waitlist form that emails
// info@thecreativereview.app and logs a row in `notifications` for audit.
//
// Deliberately standalone from the role-aware `/` route — we don't want
// logged-in admins bounced through this when they hit the marketing
// surface. Share it directly when pointing a pre-launch domain.

export const metadata: Metadata = {
  title: "The Creative Review — launching soon",
  description:
    "Leave your details and we'll email you when we open access. One email, no spam.",
};

export default function WelcomePage() {
  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <WaitlistNav />
      <main className="flex-1">
        <WaitlistHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <WaitlistCta />
      </main>
      <LandingFooter />
    </div>
  );
}
