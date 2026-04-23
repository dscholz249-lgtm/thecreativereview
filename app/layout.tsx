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

export const metadata: Metadata = {
  title: "The Creative Review",
  description:
    "A focused creative review and approval tool for freelancers and small teams. Clean approvals, click-to-pin feedback.",
  // Favicon pulls straight from the brand kit in public/brand so updates
  // are a file swap, not a code change. Same v2 paper glyph the logo
  // component uses — the ink stroke + green panel read fine at 32px.
  icons: {
    icon: "/brand/logo-glyph-2.svg",
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
