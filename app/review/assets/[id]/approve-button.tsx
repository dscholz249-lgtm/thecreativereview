"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approveDecisionAction, type ActionResult } from "./actions";

export function ApproveButton({
  assetId,
  versionId,
}: {
  assetId: string;
  versionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    approveDecisionAction,
    null,
  );
  const err = state?.ok === false ? state : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full" />}>
        Approve
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve this asset exactly as is?</DialogTitle>
          <DialogDescription>
            Your approval means no changes are needed. To leave notes, cancel
            and pick &ldquo;Request changes&rdquo; instead.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="asset_id" value={assetId} />
          <input type="hidden" name="asset_version_id" value={versionId} />
          {err?.error ? (
            <p className="text-xs text-red-600 mb-2">{err.error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Approving…" : "Yes, approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
