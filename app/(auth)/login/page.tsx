"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthActionResult } from "../actions";
import { Field, SubmitButton } from "@/components/auth-form-field";
import { AuthSplitShell } from "@/components/landing/auth-shell";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthActionResult | null, FormData>(
    login,
    null,
  );

  return (
    <AuthSplitShell
      pitchEyebrow="Creative Review · est. 2026"
      pitchHeading={
        <>
          Client feedback
          <br />
          <span style={{ color: "var(--cr-muted)" }}>without the</span>
          <br />
          email thread.
        </>
      }
      pitchSubcopy="One link per asset. Pin-accurate feedback. Clean version history. Nothing your client can't figure out on a Tuesday."
      bullets={[
        { dotColor: "var(--cr-accent-green)", label: "1,400+ studios" },
        { dotColor: "var(--cr-constructive)", label: "99.9% uptime" },
      ]}
    >
      <h2
        className="mb-2 text-[40px]"
        style={{
          fontFamily: "var(--font-display), serif",
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        Log in
      </h2>
      <p
        className="mb-7 text-[15px]"
        style={{ color: "var(--cr-muted)" }}
      >
        Welcome back.
      </p>

      <form action={action}>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        >
          <div className="mt-1 flex justify-end">
            <Link href="#" className="cr-link text-[13px]">
              Forgot?
            </Link>
          </div>
        </Field>

        {state?.ok === false ? (
          <div
            className="mb-4 flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] font-semibold"
            style={{
              background: "var(--cr-destructive-soft)",
              border: "1.5px solid var(--cr-destructive-ink)",
              borderRadius: 8,
              color: "var(--cr-destructive-ink)",
            }}
          >
            <CrossIcon /> {state.error}
          </div>
        ) : null}

        <SubmitButton pending={pending}>Log in</SubmitButton>
      </form>

      <p
        className="mt-5 text-center text-[15px]"
        style={{ color: "var(--cr-muted)" }}
      >
        No account?{" "}
        <Link href="/signup" className="cr-link">
          Sign up
        </Link>
      </p>
    </AuthSplitShell>
  );
}

function CrossIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
