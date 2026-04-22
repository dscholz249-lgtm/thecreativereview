"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { Check } from "@/components/cr-icons";
import { createProjectAction, type ActionResult } from "@/app/(app)/projects/actions";

export function NewProjectForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createProjectAction,
    null,
  );
  const err = state?.ok === false ? state : null;

  return (
    <div className="cr-card-raised p-6 sm:p-7">
      <form action={action}>
        <input type="hidden" name="client_id" value={clientId} />

        <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            placeholder="Spring campaign"
            required
            className="cr-input"
          />
        </FormField>

        <FormField
          label="Description"
          name="description"
          hint="Optional. What should clients know about this project?"
          error={err?.fieldErrors?.description}
        >
          <textarea
            id="description"
            name="description"
            rows={3}
            className="cr-textarea"
          />
        </FormField>

        <FormField
          label="Deadline"
          name="deadline"
          hint="Optional. YYYY-MM-DD."
          error={err?.fieldErrors?.deadline}
        >
          <input
            id="deadline"
            name="deadline"
            type="date"
            className="cr-input"
            style={{ maxWidth: 240 }}
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
          <Link href={`/clients/${clientId}`} className="cr-btn cr-btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="cr-btn cr-btn-constructive"
          >
            <Check /> {pending ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
