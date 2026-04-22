import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { LandingFeatures } from "@/components/landing/features";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingCta } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role-aware routing for authenticated users.
  if (user) {
    const [{ data: admin }, { data: reviewer }] = await Promise.all([
      supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("client_reviewers")
        .select("id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);
    // Admin takes precedence for the dual-role case (an admin who was also
    // invited as a reviewer on their own or another workspace). They can
    // still reach their inbox by navigating to /review/my-reviews manually.
    if (admin) redirect("/dashboard");
    if (reviewer) redirect("/review/my-reviews");
    // Authenticated but neither — fall through to the landing page.
  }

  return (
    <div className="cr-surface flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
