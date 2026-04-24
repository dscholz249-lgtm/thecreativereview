"use client";

import { useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  setPasswordAction,
  dismissPasswordSetupAction,
  type AuthActionResult,
} from "@/app/(auth)/actions";

// Shown to newly-invited admins the first time they land in the app.
// They signed in with a one-time magic link, so there's no password on
// file yet. Setting one here means they can log in the "normal" way
// next time; if they skip, they can still use the magic-link option on
// /login.
//
// `open` is controlled from the server (based on the cr_needs_password
// cookie in the layout). The save/skip actions both call
// revalidatePath("/", "layout"), which re-runs the layout with the
// cookie cleared and unmounts this component — so we don't track local
// open state. On success we also flip `open` false immediately to hide
// the modal during the re-render round trip. onOpenChange is a no-op
// (Esc and backdrop can't close — user must pick Save or Skip).
export function PasswordSetupModal({ open: initialOpen }: { open: boolean }) {
  const [state, action, pending] = useActionState<
    AuthActionResult | null,
    FormData
  >(setPasswordAction, null);

  const open = initialOpen && !state?.ok;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.01em",
            }}
          >
            Welcome — pick a password.
          </DialogTitle>
          <DialogDescription style={{ color: "var(--cr-muted)" }}>
            You signed in with a one-time link. Set a password so you can log
            in directly next time. (You can always sign in with a link later
            too.)
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="mt-2 flex flex-col gap-3">
          <label
            htmlFor="password"
            className="text-[13px] font-bold"
            style={{ color: "var(--cr-ink)", letterSpacing: "0.02em" }}
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="cr-input"
          />

          {state?.ok === false ? (
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
            className="cr-btn cr-btn-primary mt-2 w-full"
          >
            {pending ? "Saving…" : "Save password"}
          </button>
        </form>

        {/* Skip form lives outside the password form — nested forms are
            illegal HTML and React silently hoists the inner one. */}
        <form action={dismissPasswordSetupAction}>
          <button
            type="submit"
            className="cr-btn cr-btn-ghost w-full"
            style={{ fontSize: 13 }}
          >
            Skip for now
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
