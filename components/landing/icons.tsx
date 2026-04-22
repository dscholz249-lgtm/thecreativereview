// Inline SVG icon set for marketing / landing. Stroke 1.8 / 2, rounded
// linecap/linejoin — mirrors the chrome.jsx set from the design bundle
// so in-product icons stay visually coherent when they ship in PR 2/3.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function ArrowRight({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
