"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  sendManualReminderAction,
  type ActionResult,
} from "@/app/(app)/projects/actions";

// The UI-side half of the 24h rate limit is the `disabled` prop — disabled
// when the server last sent within the cooldown window. The authoritative
// enforcement is still the atomic UPDATE in sendManualReminder.
export function RemindReviewersButton({
  projectId,
  cooldownUntilIso,
}: {
  projectId: string;
  cooldownUntilIso: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    sendManualReminderAction,
    null,
  );

  const onCooldown =
    cooldownUntilIso !== null && new Date(cooldownUntilIso) > new Date();

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="project_id" value={projectId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending || onCooldown}
        title={
          onCooldown
            ? "Reviewers can only be nudged once every 24 hours."
            : "Email all reviewers with pending work on this project"
        }
      >
        {pending ? "Sending…" : onCooldown ? "Reminder on cooldown" : "Nudge reviewers"}
      </Button>
      {state && state.ok && state.message ? (
        <p className="text-xs text-neutral-600">{state.message}</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
