// Creative Review logo component — thin wrapper around the brand SVGs
// in public/brand. Renders via <img> so the output is pixel-identical
// to the design handoff (SVG text and HTML text don't render the same
// even at matching sizes; the earlier inline-SVG version was close but
// not exact, which drove the "the logo is wrong" feedback).
//
// Swapping a logo is now a file swap in public/brand/ — no code change.

import type { CSSProperties } from "react";

type Variant = "light" | "dark";

export type CreativeReviewLogoProps = {
  variant?: Variant;
  // Used to derive height via the sizing contract in public/brand/README.md.
  // Any fontSize works; 16 for nav, 32 for footer, 72+ for hero.
  fontSize?: number;
  // When false, renders just the ticket glyph (no wordmark) since the
  // lockup SVG has the eyebrow + wordmark baked in and can't be disabled.
  // Callers that want a compact mark-only version pass false.
  withEyebrow?: boolean;
  className?: string;
  style?: CSSProperties;
};

// Sizing contract lives in public/brand/README.md. Keep this in sync.
// At fontSize=16 with eyebrow the total lockup is 45.4px tall — big
// enough for the 11px minimum eyebrow to stay readable, small enough
// to fit a ~60px nav header.
function stackHeightFor(fontSize: number, withEyebrow: boolean): number {
  const eyebrowSize = Math.max(fontSize * 0.3, 11);
  const eyebrowGap = 4;
  return (withEyebrow ? eyebrowSize + eyebrowGap : 0) + fontSize * 0.95 * 2;
}

export function CreativeReviewLogo({
  variant = "light",
  fontSize = 72,
  withEyebrow = true,
  className,
  style,
}: CreativeReviewLogoProps) {
  const dark = variant === "dark";

  if (!withEyebrow) {
    // Wordmark is locked into the lockup SVG — if a caller wants no
    // wordmark flourish at all, render the standalone glyph instead.
    return (
      <CreativeReviewGlyph
        // Height-only: glyph's 120×154 aspect comes from the SVG.
        size={fontSize * 0.95 * 2}
        variant={variant}
        className={className}
        style={style}
      />
    );
  }

  const height = stackHeightFor(fontSize, true);
  const src = dark
    ? "/brand/logo-lockup-dark.svg"
    : "/brand/logo-lockup.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="The Creative Review"
      className={className}
      style={{ height, width: "auto", display: "inline-block", ...style }}
    />
  );
}

// Standalone ticket glyph. Used for tiny marks (avatars, loading
// placeholders) and, indirectly, for the favicon — app/layout.tsx's
// metadata.icons points straight at the -dark file in public/brand.
export function CreativeReviewGlyph({
  size = 40,
  variant = "light",
  className,
  style,
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
}) {
  const src = variant === "dark"
    ? "/brand/logo-glyph-dark.svg"
    : "/brand/logo-glyph.svg";
  // Glyph viewBox is 120×154 (width / height ≈ 0.78). Setting height
  // and width: auto keeps the aspect locked.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="The Creative Review"
      className={className}
      style={{ height: size, width: "auto", display: "inline-block", ...style }}
    />
  );
}

export default CreativeReviewLogo;
