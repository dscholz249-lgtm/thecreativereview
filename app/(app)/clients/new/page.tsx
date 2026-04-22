"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PageHeading } from "@/components/page-heading";
import { FormField } from "@/components/form-field";
import { Check } from "@/components/cr-icons";
import { createClientAction, type ActionResult } from "../actions";

export default function NewClientPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createClientAction,
    null,
  );
  const err = state?.ok === false ? state : null;

  return (
    <div className="max-w-[720px]">
      <PageHeading
        title="New client"
        breadcrumbs={[{ href: "/clients", label: "Clients" }, { label: "New" }]}
      />

      <div className="cr-card-raised p-6 sm:p-7">
        <form action={action}>
          <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
            <input id="name" name="name" placeholder="Acme Coffee" required className="cr-input" />
          </FormField>

          <FormField
            label="Primary contact email"
            name="primary_email"
            error={err?.fieldErrors?.primary_email}
            hint="We'll use this when sending reminder notices and approvals."
          >
            <input
              id="primary_email"
              name="primary_email"
              type="email"
              placeholder="ops@acme.test"
              required
              className="cr-input"
            />
          </FormField>

          <FormField
            label="Logo URL"
            name="logo_url"
            error={err?.fieldErrors?.logo_url}
            hint="Optional. Paste a direct link to a logo image."
          >
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              placeholder="https://…"
              className="cr-input"
            />
          </FormField>

          {err?.error ? (
            <p
              className="mb-4 text-[13px] font-semibold"
              style={{ color: "var(--cr-destructive-ink)" }}
            >
              {err.error}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2.5">
            <Link href="/clients" className="cr-btn cr-btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="cr-btn cr-btn-constructive"
            >
              <Check /> {pending ? "Creating…" : "Create client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
