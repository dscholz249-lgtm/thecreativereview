// Shared inline styles for React Email templates. Email clients ignore
// external stylesheets and class selectors, so everything is inline.

import type { CSSProperties } from "react";

export const body: CSSProperties = {
  backgroundColor: "#f7f7f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};
export const container: CSSProperties = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e5e4e0",
};
export const heading: CSSProperties = {
  fontSize: "22px",
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "0 0 12px",
};
export const paragraph: CSSProperties = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#3a3a3a",
  margin: "0 0 16px",
};
export const buttonSection: CSSProperties = {
  textAlign: "center",
  margin: "28px 0 24px",
};
export const button: CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};
export const small: CSSProperties = {
  fontSize: "12px",
  color: "#6b6b6b",
  lineHeight: "18px",
  margin: "20px 0 4px",
};
export const link: CSSProperties = {
  color: "#185fa5",
  wordBreak: "break-all",
};
export const footer: CSSProperties = {
  fontSize: "12px",
  color: "#9c9c9c",
  lineHeight: "16px",
  marginTop: "24px",
};
export const listItem: CSSProperties = {
  fontSize: "14px",
  color: "#1a1a1a",
  lineHeight: "22px",
  margin: "4px 0",
  borderBottom: "1px solid #f1efe8",
  paddingBottom: "6px",
};
