import type { Metadata } from "next";
import { Roboto_Slab, Inter, JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { env } from "@/lib/env";
import "./globals.css";

// Display face — bold slab serif for headlines and hero type. Per the design
// system we only use 700 / 800 weights; anything lighter reads too editorial.
const robotoSlab = Roboto_Slab({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

// Body face — Inter Medium for everything non-display. 16px minimum across
// the app (enforced in globals.css body defaults).
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Mono — URLs, IDs, deadlines in metadata blocks.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const description =
  "A focused creative review and approval tool for freelancers and small teams. Clean approvals, click-to-pin feedback.";

export const metadata: Metadata = {
  // metadataBase lets Next.js resolve the relative opengraph-image /
  // twitter-image URLs against the live origin. In local dev it'll pick
  // up localhost:3000 from the env fallback.
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "The Creative Review",
    template: "%s · The Creative Review",
  },
  description,
  // Favicon pulls straight from the brand kit in public/brand so updates
  // are a file swap, not a code change. Same v2 paper glyph the logo
  // component uses — the ink stroke + green panel read fine at 32px.
  icons: {
    icon: "/brand/logo-glyph-2.svg",
  },
  // The OG + Twitter images auto-resolve from app/opengraph-image.tsx +
  // app/twitter-image.tsx (Next 16 file convention). Only the text
  // metadata needs to live here.
  openGraph: {
    title: "The Creative Review — ship the work, skip the email thread.",
    description,
    url: "/",
    siteName: "The Creative Review",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Creative Review",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${robotoSlab.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      {/* GA4 loads after hydration; the Next.js component handles the
          gtag dataLayer bootstrap. Gated on an env var so dev / local
          builds don't send noise to the prod property. */}
      {env.NEXT_PUBLIC_GA_ID ? (
        <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />
      ) : null}
    </html>
  );
}
