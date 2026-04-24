"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/form-field";
import { ArrowRight } from "@/components/cr-icons";
import { inviteAdminAction, type ActionResult } from "./actions";

export function InviteAdminForm({ atCap }: { atCap: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    inviteAdminAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const err = state?.ok === false ? state : null;
  const success = state?.ok ? state.message : null;

  // Reset the email field after a successful invite — otherwise the
  // address stays in the box and feels like nothing happened.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="cr-card-raised p-6">
      <form ref={formRef} action={action}>
        <FormField
          label="Email"
          name="email"
          hint="They'll get a 30-day sign-in link. New admins pick their password after clicking through."
        >
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@studio.com"
            className="cr-input"
            disabled={atCap}
          />
        </FormField>

        {err?.error ? (
          <p
            className="mb-3 text-[13px] font-semibold"
            style={{ color: "var(--cr-destructive-ink)" }}
          >
            {err.error}
          </p>
        ) : null}
        {success ? (
          <p
            className="mb-3 text-[13px] font-semibold"
            style={{ color: "var(--cr-constructive)" }}
          >
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || atCap}
          className="cr-btn cr-btn-primary w-full"
        >
          {pending ? "Sending…" : "Send invite"} <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
}
