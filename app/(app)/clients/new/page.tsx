"use client";

import { useActionState } from "react";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { createClientAction, type ActionResult } from "../actions";

export default function NewClientPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createClientAction,
    null,
  );

  const err = state?.ok === false ? state : null;

  return (
    <div className="max-w-xl">
      <PageHeading
        title="New client"
        breadcrumbs={[{ href: "/clients", label: "Clients" }, { label: "New" }]}
      />
      <Card>
        <CardContent className="py-6">
          <form action={action} className="flex flex-col gap-4">
            <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
              <Input id="name" name="name" placeholder="Acme Coffee" required />
            </FormField>
            <FormField
              label="Primary contact email"
              name="primary_email"
              error={err?.fieldErrors?.primary_email}
            >
              <Input
                id="primary_email"
                name="primary_email"
                type="email"
                placeholder="ops@acme.test"
                required
              />
            </FormField>
            <FormField
              label="Logo URL"
              name="logo_url"
              hint="Optional. Paste a direct link to a logo image."
              error={err?.fieldErrors?.logo_url}
            >
              <Input id="logo_url" name="logo_url" type="url" placeholder="https://…" />
            </FormField>
            {err?.error ? <p className="text-xs text-red-600">{err.error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
