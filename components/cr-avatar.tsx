import type { ReactNode } from "react";

// Initials disc. Two tones: ink (default) and accent-green. A `size`
// option for the larger discs on client-detail headers.

type Variant = "ink" | "green";
type Size = "default" | "sm" | "lg";

const SIZES: Record<Size, { px: number; fontSize: number; radius: number }> = {
  default: { px: 34, fontSize: 14, radius: 8 },
  sm: { px: 28, fontSize: 12, radius: 6 },
  lg: { px: 52, fontSize: 18, radius: 10 },
};

export function Avatar({
  label,
  variant = "ink",
  size = "default",
}: {
  label: string;
  variant?: Variant;
  size?: Size;
}) {
  const { px, fontSize, radius } = SIZES[size];
  const initials = initialsOf(label);
  const style: React.CSSProperties =
    variant === "green"
      ? {
          background: "var(--cr-accent-green)",
          color: "var(--cr-accent-green-ink)",
        }
      : { background: "var(--cr-ink)", color: "var(--cr-card)" };

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        fontFamily: "var(--font-display), serif",
        fontWeight: 700,
        fontSize,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

// Deterministic variant from the label so the same client always gets the
// same swatch. Splits roughly 1/3 green, 2/3 ink — green reads as the
// "friendly" accent so keep it the minority.
export function avatarVariantFor(seed: string): Variant {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 3 === 0 ? "green" : "ink";
}

function initialsOf(label: string): ReactNode {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  const chars = words.slice(0, 2).map((w) => w[0].toUpperCase());
  return chars.join("");
}
