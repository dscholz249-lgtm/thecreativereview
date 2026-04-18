"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionResult } from "../actions";
import { Field, SubmitButton } from "@/components/auth-form-field";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthActionResult | null, FormData>(
    signup,
    null,
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Create your workspace</h1>
      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Workspace name"
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
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        {state?.ok && state.message ? (
          <p className="text-sm text-green-700">{state.message}</p>
        ) : null}
        <SubmitButton pending={pending}>Create workspace</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
