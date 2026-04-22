"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  login,
  sendMagicLinkAction,
  type AuthActionResult,
} from "../actions";
import { Field, SubmitButton } from "@/components/auth-form-field";
import { AuthSplitShell } from "@/components/landing/auth-shell";

// Three render states:
//   - password  → email + password form, "Forgot?" link flips to magic
//   - magic     → email-only form, submits sendMagicLinkAction
//   - sent      → confirmation. Deliberately shows the same text regardless
//                 of whether Supabase actually found an account (see
//                 sendMagicLinkAction for the enumeration-leak swallowing).
type Mode = "password" | "magic" | "sent";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [loginState, loginAction, loginPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(login, null);
  const [magicState, magicAction, magicPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(sendMagicLinkAction, null);

  // Flip to the confirmation screen the moment the magic action succeeds.
  // We read the render state here rather than in an effect — the action
  // result settles before the next render anyway.
  if (
    mode === "magic" &&
    magicState?.ok &&
    !magicPending &&
    mode !== ("sent" as Mode)
  ) {
    // setState inside render is safe if guarded — React bails out if the
    // value is identical. Scheduling via requestAnimationFrame would work
    // too but is overkill for a one-shot transition.
    setMode("sent");
  }

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
      {mode === "sent" ? (
        <MagicLinkSent
          message={magicState?.ok ? magicState.message : undefined}
          onRetry={() => setMode("magic")}
          onBackToPassword={() => setMode("password")}
        />
      ) : mode === "magic" ? (
        <>
          <h2
            className="mb-2 text-[40px]"
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Sign-in link
          </h2>
          <p
            className="mb-7 text-[15px]"
            style={{ color: "var(--cr-muted)" }}
          >
            We&apos;ll email a one-click link — no password needed.
          </p>

          <form action={magicAction}>
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
            />

            {magicState?.ok === false ? (
              <ErrorBanner>{magicState.error}</ErrorBanner>
            ) : null}

            <SubmitButton pending={magicPending}>
              Send sign-in link
            </SubmitButton>
          </form>

          <p
            className="mt-5 text-center text-[15px]"
            style={{ color: "var(--cr-muted)" }}
          >
            <button
              type="button"
              onClick={() => setMode("password")}
              className="cr-link cursor-pointer border-0 bg-transparent p-0"
            >
              Sign in with password instead
            </button>
          </p>
        </>
      ) : (
        <>
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

          <form action={loginAction}>
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
            >
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="cr-link cursor-pointer border-0 bg-transparent p-0 text-[13px]"
                >
                  Forgot?
                </button>
              </div>
            </Field>

            {loginState?.ok === false ? (
              <ErrorBanner>{loginState.error}</ErrorBanner>
            ) : null}

            <SubmitButton pending={loginPending}>Log in</SubmitButton>
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
        </>
      )}
    </AuthSplitShell>
  );
}

function MagicLinkSent({
  message,
  onRetry,
  onBackToPassword,
}: {
  message: string | undefined;
  onRetry: () => void;
  onBackToPassword: () => void;
}) {
  return (
    <>
      <div
        className="mb-6 flex size-14 items-center justify-center rounded-[14px]"
        style={{
          background: "var(--cr-accent-green)",
          color: "var(--cr-accent-green-ink)",
        }}
      >
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z" />
          <polyline points="22,8 12,15 2,8" />
        </svg>
      </div>
      <h2
        className="mb-3 text-[36px]"
        style={{
          fontFamily: "var(--font-display), serif",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        Check your email.
      </h2>
      <p
        className="mb-6 text-[16px] leading-[1.5]"
        style={{ color: "var(--cr-ink-2)" }}
      >
        {message ??
          "If an account exists for that email, we sent a sign-in link. Click it to finish signing in — no password needed."}
      </p>
      <p className="text-[14px]" style={{ color: "var(--cr-muted)" }}>
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={onRetry}
          className="cr-link cursor-pointer border-0 bg-transparent p-0"
        >
          Try again
        </button>{" "}
        or{" "}
        <button
          type="button"
          onClick={onBackToPassword}
          className="cr-link cursor-pointer border-0 bg-transparent p-0"
        >
          sign in with password
        </button>
        .
      </p>
    </>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] font-semibold"
      style={{
        background: "var(--cr-destructive-soft)",
        border: "1.5px solid var(--cr-destructive-ink)",
        borderRadius: 8,
        color: "var(--cr-destructive-ink)",
      }}
    >
      <CrossIcon /> {children}
    </div>
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
