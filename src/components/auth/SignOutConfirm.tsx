"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { notify } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";

/**
 * The one place signing out happens.
 *
 * Shared by the account menu and the settings dialog so the two cannot drift:
 * the same wording, the same confirmation, and the same landing afterwards.
 * A "Sign out" that asks in one corner of the app and not in another is its own
 * small bug.
 *
 * Framed as a question rather than a warning. Signing out destroys nothing —
 * work on this device stays, and the account's own projects are still on the
 * server — so the dialog says what changes rather than implying loss.
 */
export function SignOutConfirm({
  open,
  onOpenChange,
  onSignedOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fires only when the user actually signed out — not when they cancelled.
   * The confirmation closes either way, so a caller that wants to tidy up
   * behind it needs the difference.
   */
  onSignedOut?: () => void;
}) {
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  async function confirm() {
    try {
      await signOut();
    } catch {
      // `signOut` clears the local session before it touches the network, so
      // the user is signed out here either way; a failed request only leaves a
      // server session that expires on its own.
    }

    notify.info("Signed out", "Work saved on this device is still here.");
    onSignedOut?.();
    // Leaving the page matters: the editor and dashboard both work signed out,
    // so staying put would look as though the click did nothing.
    router.push("/");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out?"
      description="Projects saved on this device stay here. Anything that only exists in your account will not be listed again until you sign back in."
      confirmLabel="Sign out"
      tone="default"
      onConfirm={confirm}
    />
  );
}
