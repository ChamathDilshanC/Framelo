"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  /**
   * The cancel *button*, when declining is itself a choice.
   *
   * Fires only from the button, never from Escape or a click on the overlay.
   * Those two mean "I did not mean to open this", and a dialog that acted on
   * them would make dismissing it do something — the one thing dismissing must
   * never do. Where cancelling has no consequence, leave this unset.
   */
  onCancel?: () => void;
}

/**
 * Confirmation for actions that cannot be undone.
 *
 * A real dialog rather than `window.confirm`: the native one cannot say what is
 * about to be lost, cannot be styled to match, blocks the main thread, and is
 * suppressible by the browser.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        style={{ ["--dialog-width" as string]: "420px" }}
      >
        <footer className="flex items-center justify-end gap-2 px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy ? <Spinner className="border-t-white" /> : null}
            {confirmLabel}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
