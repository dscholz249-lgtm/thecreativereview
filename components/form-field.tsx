import type { ReactNode } from "react";

// Admin-form field wrapper using the cr-* typography tokens. Drop raw
// <input className="cr-input"> / <textarea className="cr-textarea"> inside
// as children — the wrapper owns the label, error, and hint rows.

export function FormField({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-[14px] font-bold"
        style={{ color: "var(--cr-ink)", letterSpacing: "0.02em" }}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--cr-destructive-ink)" }}
        >
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
