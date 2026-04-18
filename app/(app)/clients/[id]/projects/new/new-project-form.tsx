"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { createProjectAction, type ActionResult } from "@/app/(app)/projects/actions";

export function NewProjectForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createProjectAction,
    null,
  );
  const err = state?.ok === false ? state : null;

  return (
    <Card>
      <CardContent className="py-6">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="client_id" value={clientId} />
          <FormField label="Name" name="name" error={err?.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Spring campaign" required />
          </FormField>
          <FormField
            label="Description"
            name="description"
            hint="Optional. What should clients know about this project?"
            error={err?.fieldErrors?.description}
          >
            <Textarea id="description" name="description" rows={3} />
          </FormField>
          <FormField
            label="Deadline"
            name="deadline"
            hint="Optional. YYYY-MM-DD."
            error={err?.fieldErrors?.deadline}
          >
            <Input id="deadline" name="deadline" type="date" />
          </FormField>
          {err?.error ? <p className="text-xs text-red-600">{err.error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
