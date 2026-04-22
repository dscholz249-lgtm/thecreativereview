"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check } from "@/components/cr-icons";
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
      <DialogTrigger
        render={
          <button
            type="button"
            className="cr-btn cr-btn-constructive cr-btn-lg"
            style={{ width: "100%" }}
          />
        }
      >
        <Check /> Approve
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.01em",
            }}
          >
            Approve this asset exactly as is?
          </DialogTitle>
          <DialogDescription style={{ color: "var(--cr-muted)" }}>
            Your approval means no changes are needed. To leave notes, cancel
            and pick &ldquo;Request changes&rdquo; instead.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="asset_id" value={assetId} />
          <input type="hidden" name="asset_version_id" value={versionId} />
          {err?.error ? (
            <p
              className="mb-2 text-[13px] font-semibold"
              style={{ color: "var(--cr-destructive-ink)" }}
            >
              {err.error}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="button"
              className="cr-btn cr-btn-ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cr-btn cr-btn-constructive"
              disabled={pending}
            >
              <Check /> {pending ? "Approving…" : "Yes, approve"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
