// Auth-page form primitives. Built on the cr-* design tokens so login /
// signup match the marketing surface exactly; in-product forms have
// slightly different spacing and will get their own primitives in PR 3.

import type { ReactNode } from "react";

export function Field({
  label,
  name,
  type = "text",
  required = true,
  autoComplete,
  placeholder,
  minLength,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  defaultValue?: string;
  children?: ReactNode;
}) {
  return (
    <label className="mb-5 flex flex-col gap-2">
      <span
        className="text-[14px] font-bold"
        style={{ color: "var(--cr-ink)", letterSpacing: "0.02em" }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        defaultValue={defaultValue}
        className="cr-input"
      />
      {children}
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="cr-btn cr-btn-primary cr-btn-lg w-full"
    >
      {pending ? "Working…" : children}
    </button>
  );
}
