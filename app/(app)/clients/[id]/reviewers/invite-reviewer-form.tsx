"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { inviteReviewerAction, type ActionResult } from "./actions";

export function InviteReviewerForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    inviteReviewerAction,
    null,
  );
  const err = state?.ok === false ? state : null;
  const success = state?.ok ? state.message : null;

  return (
    <Card>
      <CardContent className="py-6">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="client_id" value={clientId} />
          <FormField label="Email" name="email" error={err?.fieldErrors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="reviewer@client.com"
            />
          </FormField>
          <FormField
            label="Name"
            name="name"
            hint="Optional. Shown on emails and decision attribution."
            error={err?.fieldErrors?.name}
          >
            <Input id="name" name="name" placeholder="Jane Doe" />
          </FormField>
          {err?.error ? <p className="text-xs text-red-600">{err.error}</p> : null}
          {success ? (
            <p className="text-xs text-green-700">{success}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
