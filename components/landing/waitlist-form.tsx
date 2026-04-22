"use client";

import { useActionState } from "react";
import { ArrowRight } from "./icons";
import {
  submitWaitlistAction,
  type WaitlistActionResult,
} from "@/app/welcome/actions";

// Reusable waitlist form — used in the hero AND the final CTA of /welcome.
// Keep both instances in sync by sharing the component instead of duplicating
// markup. Successful state replaces the form with a confirmation so someone
// who fills it out twice doesn't accidentally spam Dan's inbox.

export function WaitlistForm({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const [state, action, pending] = useActionState<
    WaitlistActionResult | null,
    FormData
  >(submitWaitlistAction, null);

  if (state?.ok) {
    return (
      <div
        className="px-5 py-4 text-[15px] font-semibold"
        style={
          variant === "dark"
            ? {
                background: "var(--cr-card)",
                border: "1.5px solid var(--cr-card)",
                borderRadius: "var(--cr-radius)",
                color: "var(--cr-ink)",
                boxShadow: "2px 2px 0 var(--cr-accent-green)",
              }
            : {
                background: "var(--cr-constructive-soft)",
                border: "1.5px solid var(--cr-constructive)",
                borderRadius: "var(--cr-radius)",
                color: "var(--cr-constructive)",
              }
        }
      >
        {state.message}
      </div>
    );
  }

  const labelColor =
    variant === "dark" ? "var(--cr-paper)" : "var(--cr-ink)";

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <FieldInline
          label="Your name"
          labelColor={labelColor}
          name="name"
          placeholder="Jamie Lee"
          required
          autoComplete="name"
        />
        <FieldInline
          label="Email"
          labelColor={labelColor}
          name="email"
          type="email"
          placeholder="you@studio.com"
          required
          autoComplete="email"
        />
      </div>
      <FieldInline
        label="Agency or studio name (optional)"
        labelColor={labelColor}
        name="agency"
        placeholder="Dana Design Studio"
        autoComplete="organization"
      />

      {state && !state.ok ? (
        <p
          className="text-[13px] font-semibold"
          style={{
            color:
              variant === "dark"
                ? "#F4C4C4"
                : "var(--cr-destructive-ink)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cr-btn cr-btn-lg"
        style={
          variant === "dark"
            ? {
                background: "var(--cr-card)",
                color: "var(--cr-ink)",
                borderColor: "var(--cr-card)",
                boxShadow: "2px 2px 0 var(--cr-accent-green)",
                marginTop: 4,
              }
            : {
                background: "var(--cr-ink)",
                color: "var(--cr-card)",
                borderColor: "var(--cr-ink)",
                marginTop: 4,
              }
        }
      >
        {pending ? "Sending…" : "Get early access"} <ArrowRight size={16} />
      </button>
      <p
        className="text-[12px]"
        style={{
          color:
            variant === "dark"
              ? "rgba(250,250,247,0.6)"
              : "var(--cr-muted)",
        }}
      >
        No spam. One email when we open access.
      </p>
    </form>
  );
}

function FieldInline({
  label,
  labelColor,
  name,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
}: {
  label: string;
  labelColor: string;
  name: string;
  type?: "text" | "email";
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span
        className="text-[13px] font-bold"
        style={{ color: labelColor, letterSpacing: "0.02em" }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="cr-input"
      />
    </label>
  );
}
