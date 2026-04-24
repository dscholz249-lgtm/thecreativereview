import { ImageResponse } from "next/og";

// 1200×630 branded social card. Applies to every route unless a route
// defines its own `opengraph-image.tsx` — the same convention Next.js
// uses for favicon/robots/sitemap. Twitter pulls through
// `twitter-image.tsx` next to this file.

export const alt =
  "The Creative Review — Ship the work. Skip the email thread.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Google Fonts serves its CSS differently based on UA — a desktop Chrome
// UA gets woff2, older UAs get TTF. Satori (the renderer behind
// ImageResponse) can chew through both, but TTF is the safer bet.
// Parsed regex grabs whatever URL Google hands back for this weight.
async function fetchGoogleFont(family: string, weight: number) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!cssRes.ok) {
    throw new Error(`Font CSS fetch failed for ${family}:${weight}`);
  }
  const css = await cssRes.text();
  const urlMatch = css.match(/src: url\(([^)]+)\)/);
  if (!urlMatch) {
    throw new Error(`Could not resolve font URL for ${family}:${weight}`);
  }
  const fontRes = await fetch(urlMatch[1]);
  return await fontRes.arrayBuffer();
}

export default async function Image() {
  const [slab800, inter500] = await Promise.all([
    fetchGoogleFont("Roboto+Slab", 800),
    fetchGoogleFont("Inter", 500),
  ]);

  const ink = "#0A0A0A";
  const paper = "#F5F3EE";
  const muted = "#5C5C58";
  const green = "#34D17E";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: paper,
          padding: "72px 80px",
          justifyContent: "space-between",
          color: ink,
        }}
      >
        {/* Lockup — paper square with green check panel, same shape as
            the app icon. Uses a bold check glyph instead of the curve
            from the SVG so we don't have to bundle the path. */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 96,
              height: 96,
              background: paper,
              border: `4px solid ${ink}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 72,
                height: 68,
                background: green,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Inter",
                fontSize: 52,
                fontWeight: 800,
                color: ink,
                lineHeight: 1,
              }}
            >
              ✓
            </div>
          </div>
          <div
            style={{
              fontFamily: "RobotoSlab",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.01em",
            }}
          >
            The Creative Review
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 0.95,
            letterSpacing: "-0.035em",
          }}
        >
          <div
            style={{
              fontFamily: "RobotoSlab",
              fontSize: 96,
              fontWeight: 800,
            }}
          >
            Ship the work.
          </div>
          <div
            style={{
              fontFamily: "RobotoSlab",
              fontSize: 96,
              fontWeight: 800,
              color: muted,
            }}
          >
            Skip the email thread.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "Inter",
            fontSize: 24,
            color: muted,
          }}
        >
          <div>thecreativereview.app</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: green,
              }}
            />
            Client review · built for studios
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "RobotoSlab", data: slab800, style: "normal", weight: 800 },
        { name: "Inter", data: inter500, style: "normal", weight: 500 },
      ],
    },
  );
}
