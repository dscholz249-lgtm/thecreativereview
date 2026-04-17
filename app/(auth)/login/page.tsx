"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthActionResult } from "../actions";
import { Field, SubmitButton } from "@/components/auth-form-field";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthActionResult | null, FormData>(
    login,
    null,
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {state?.ok === false ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        <SubmitButton pending={pending}>Log in</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-neutral-600">
        No account?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
