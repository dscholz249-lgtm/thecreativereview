"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionResult } from "../actions";
import { Field, SubmitButton } from "@/components/auth-form-field";
import { AuthSplitShell } from "@/components/landing/auth-shell";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthActionResult | null, FormData>(
    signup,
    null,
  );

  return (
    <AuthSplitShell
      pitchEyebrow="Creative Review · est. 2026"
      pitchHeading={
        <>
          A studio,
          <br />
          <span style={{ color: "var(--cr-muted)" }}>ready for</span>
          <br />
          review.
        </>
      }
      pitchSubcopy="Spin up a workspace in under a minute. Invite your clients, upload an asset, ship approvals with the receipts to prove it."
      bullets={[
        { dotColor: "var(--cr-constructive)", label: "Cancel anytime" },
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
        Create your studio
      </h2>
      <p className="mb-7 text-[15px]" style={{ color: "var(--cr-muted)" }}>
        Two minutes to spin up.
      </p>

      <form action={action}>
        <Field
          label="Studio name"
          name="workspace_name"
          placeholder="Dana Design Studio"
        />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />

        {state?.ok === false ? (
          <div
            className="mb-4 px-3.5 py-2.5 text-[14px] font-semibold"
            style={{
              background: "var(--cr-destructive-soft)",
              border: "1.5px solid var(--cr-destructive-ink)",
              borderRadius: 8,
              color: "var(--cr-destructive-ink)",
            }}
          >
            {state.error}
          </div>
        ) : null}
        {state?.ok && state.message ? (
          <div
            className="mb-4 px-3.5 py-2.5 text-[14px] font-semibold"
            style={{
              background: "var(--cr-constructive-soft)",
              border: "1.5px solid var(--cr-constructive)",
              borderRadius: 8,
              color: "var(--cr-constructive)",
            }}
          >
            {state.message}
          </div>
        ) : null}

        <SubmitButton pending={pending}>Create studio</SubmitButton>
      </form>

      <p
        className="mt-5 text-center text-[15px]"
        style={{ color: "var(--cr-muted)" }}
      >
        Already have an account?{" "}
        <Link href="/login" className="cr-link">
          Log in
        </Link>
      </p>
    </AuthSplitShell>
  );
}
