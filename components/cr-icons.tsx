// Shared inline SVG icon set — mirrors the chrome.jsx set from the Claude
// Design bundle so admin and marketing use the same glyphs. Stroke 1.5–2,
// rounded caps/joins. Keep this file shallow; no runtime deps beyond React.

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

export function ArrowRight({ size = 16, ...rest }: P) {
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
export function Check({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 8.5 7 12l6-8" />
    </svg>
  );
}
export function X({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...rest}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
export function Plus({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...rest}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
export function Upload({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M8 11V3M5 6l3-3 3 3M3 13h10" />
    </svg>
  );
}
export function Archive({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="2" y="3" width="12" height="3" rx="1" />
      <path d="M3 6v7h10V6M6.5 9h3" />
    </svg>
  );
}
export function Chevron({ size = 12, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 4.5 6 7.5l3-3" />
    </svg>
  );
}
export function Folder({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M2 5a1 1 0 0 1 1-1h3.5l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
    </svg>
  );
}
export function File({ size = 16, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
    </svg>
  );
}
export function Pin({ size = 14, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="currentColor" {...rest}>
      <path d="M8.5 1.2 12.8 5.5 11.1 7.2l-.7-.7-3 3 .2 2.6-1.5 1.5-2.4-2.4L1 13.6l.3-2.7 2.4-2.4L1.3 6.1l1.5-1.5 2.6.2 3-3-.7-.7z" />
    </svg>
  );
}
