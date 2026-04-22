"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { ArrowRight } from "@/components/cr-icons";
import { inviteReviewerAction, type ActionResult } from "./actions";

export function InviteReviewerForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    inviteReviewerAction,
    null,
  );
  const err = state?.ok === false ? state : null;
  const success = state?.ok ? state.message : null;

  return (
    <div className="cr-card-raised p-6">
      <form action={action}>
        <input type="hidden" name="client_id" value={clientId} />

        <FormField label="Email" name="email" error={err?.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="reviewer@client.com"
            className="cr-input"
          />
        </FormField>

        <FormField
          label="Name"
          name="name"
          hint="Optional. Shown on emails and decision attribution."
          error={err?.fieldErrors?.name}
        >
          <input
            id="name"
            name="name"
            placeholder="Jane Doe"
            className="cr-input"
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
          disabled={pending}
          className="cr-btn cr-btn-primary w-full"
        >
          {pending ? "Sending…" : "Send invite"} <ArrowRight size={14} />
        </button>
      </form>
    </div>
  );
}
