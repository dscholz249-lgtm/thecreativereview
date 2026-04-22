// Creative Review — Logo 04B (Filmstrip-check) — TypeScript port of the
// design bundle's CreativeReviewLogo.jsx. Sizing contract is mathematical:
// the ticket height is locked to the wordmark stack (eyebrow + "Creative"
// + "Review") so cap and baseline align. Don't stretch the ticket
// independently — size via `fontSize` and the ratios hold.
//
// Tokens:
//   --cr-ink, --cr-paper, --cr-accent-green, --cr-muted, --font-display
// Override ink/paper via props only when rendering outside the app shell
// (e.g. burned into an email image where CSS vars don't resolve).

import type { CSSProperties } from "react";

type Variant = "light" | "dark";

export type CreativeReviewLogoProps = {
  variant?: Variant;
  fontSize?: number;
  withEyebrow?: boolean;
  className?: string;
  style?: CSSProperties;
};

const INK_LIGHT = "var(--cr-ink)";
const INK_DARK = "#FAFAF7";
const PAPER_LIGHT = "var(--cr-paper)";
const PAPER_DARK = "var(--cr-ink)";

export function CreativeReviewLogo({
  variant = "light",
  fontSize = 72,
  withEyebrow = true,
  className,
  style,
}: CreativeReviewLogoProps) {
  const dark = variant === "dark";

  // Wordmark stack height = eyebrow row + gap + two wordmark lines.
  const eyebrowSize = fontSize * 0.3;
  const eyebrowGap = 4;
  const stackH =
    (withEyebrow ? eyebrowSize + eyebrowGap : 0) + fontSize * 0.95 * 2;

  const ticketH = stackH;
  const ticketW = ticketH * 0.78;

  const inkFill = dark ? INK_DARK : INK_LIGHT;
  const ticketFill = dark ? PAPER_DARK : PAPER_LIGHT;
  const wordmarkColor = dark ? INK_DARK : INK_LIGHT;
  const eyebrowColor = dark ? "rgba(255,255,255,0.55)" : "var(--cr-muted)";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        gap: fontSize * 0.3,
        ...style,
      }}
    >
      <CreativeReviewGlyph
        width={ticketW}
        height={ticketH}
        variant={variant}
        inkFill={inkFill}
        ticketFill={ticketFill}
      />
      <div
        style={{
          fontFamily: "var(--font-display), 'Roboto Slab', Georgia, serif",
          fontWeight: 800,
          fontSize,
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          color: wordmarkColor,
        }}
      >
        {withEyebrow ? (
          <div
            style={{
              fontFamily: "var(--font-display), 'Roboto Slab', Georgia, serif",
              fontWeight: 600,
              fontSize: eyebrowSize,
              letterSpacing: "-0.01em",
              color: eyebrowColor,
              marginBottom: eyebrowGap,
            }}
          >
            The
          </div>
        ) : null}
        <div>Creative</div>
        <div>Review</div>
      </div>
    </div>
  );
}

// Standalone ticket glyph. Use for favicon, app icon, avatars — anywhere
// the full lockup would be too wide. The inner check panel is always
// accent-green; the frame flips with `variant`.
export function CreativeReviewGlyph({
  size,
  width,
  height,
  variant = "light",
  inkFill,
  ticketFill,
}: {
  size?: number;
  width?: number;
  height?: number;
  variant?: Variant;
  inkFill?: string;
  ticketFill?: string;
}) {
  const dark = variant === "dark";
  const w = size ?? width ?? 40;
  const h = size ?? height ?? 52;
  const _ink = inkFill ?? (dark ? INK_DARK : INK_LIGHT);
  const _fill = ticketFill ?? (dark ? PAPER_DARK : PAPER_LIGHT);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ flexShrink: 0 }}
      role="img"
      aria-label="The Creative Review"
    >
      <rect
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        rx={8}
        fill={_fill}
        stroke={_ink}
        strokeWidth={4}
      />
      <rect
        x={w * 0.12}
        y={h * 0.22}
        width={w * 0.76}
        height={h * 0.56}
        rx={4}
        fill="var(--cr-accent-green)"
      />
      <path
        d={`M ${w * 0.25} ${h * 0.52} L ${w * 0.44} ${h * 0.68} L ${w * 0.75} ${h * 0.32}`}
        stroke="var(--cr-ink)"
        strokeWidth={w * 0.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default CreativeReviewLogo;
