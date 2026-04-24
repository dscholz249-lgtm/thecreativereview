"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAssetShareLinkAction,
  type ShareLinkResult,
} from "./actions";

// Reviewer-facing "Share view-only" button. Mints a 30-day token via the
// server action, opens a modal showing the URL + a copy-to-clipboard button.
// The recipient opens the URL, sees the asset, and can NOT approve, reject,
// or comment — the /share/asset/[token] route renders a read-only view.
export function ShareLinkButton({
  assetId,
  assetVersionId,
}: {
  assetId: string;
  assetVersionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<ShareLinkResult | null, FormData>(
    createAssetShareLinkAction,
    null,
  );

  async function copyUrl() {
    if (!state?.ok) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API can fail in insecure contexts — let the URL input
      // stay selectable so the reviewer can still copy manually.
    }
  }

  return (
    <>
      <button
        type="button"
        className="cr-btn cr-btn-lg"
        style={{ width: "100%" }}
        onClick={() => setOpen(true)}
      >
        <ShareGlyph /> Share view-only link
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "var(--font-display), serif",
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: "-0.01em",
              }}
            >
              Share this asset, view-only
            </DialogTitle>
            <DialogDescription style={{ color: "var(--cr-muted)" }}>
              Anyone with the link can open the asset and its notes. They
              can&apos;t approve, request changes, or leave comments. Links
              stay live for 30 days.
            </DialogDescription>
          </DialogHeader>

          {!state?.ok ? (
            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="asset_id" value={assetId} />
              <input
                type="hidden"
                name="asset_version_id"
                value={assetVersionId}
              />
              {state && !state.ok ? (
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--cr-destructive-ink)" }}
                >
                  {state.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={pending}
                className="cr-btn cr-btn-primary w-full"
              >
                {pending ? "Creating link…" : "Create share link"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                readOnly
                value={state.url}
                className="cr-input"
                onFocus={(e) => e.currentTarget.select()}
                style={{ fontSize: 13 }}
              />
              <button
                type="button"
                className="cr-btn cr-btn-primary w-full"
                onClick={copyUrl}
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <p className="text-[13px]" style={{ color: "var(--cr-muted)" }}>
                Expires {new Date(state.expiresAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShareGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="3.5" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="12.5" r="2" />
      <path d="M5.8 7 10.2 4.5M5.8 9l4.4 2.5" />
    </svg>
  );
}
