"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { GoogleMark } from "@/components/brand/GoogleMark";
import { useAuthStore } from "@/store/auth-store";

/**
 * Sign in or create an account.
 *
 * Lives on its own because it is reached from two places that share nothing
 * else: the dashboard's account menu, and settings — which opens from inside
 * the editor, where that menu does not exist.
 */
export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const signInWithPassword = useAuthStore((state) => state.signInWithPassword);
  const signUpWithPassword = useAuthStore((state) => state.signUpWithPassword);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  async function continueWithGoogle() {
    setRedirecting(true);
    try {
      // Resolves once the browser has been handed to Google, so the dialog is
      // left in its redirecting state rather than being closed as if done.
      await signInWithGoogle();
    } catch (error) {
      setRedirecting(false);
      notify.error(
        "Could not start Google sign-in",
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    try {
      if (mode === "sign-in") {
        await signInWithPassword(email, password);
        notify.success("Signed in");
      } else {
        await signUpWithPassword(email, password, name);
        notify.success("Account created", "Check your inbox if confirmation is required.");
      }
      onOpenChange(false);
    } catch (error) {
      notify.error(
        mode === "sign-in" ? "Could not sign in" : "Could not create the account",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={mode === "sign-in" ? "Sign in" : "Create an account"}
        description="Sync projects across devices, share links and publish a portfolio."
        style={{ ["--dialog-width" as string]: "420px" }}
      >
        <div className="space-y-3 px-5 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={redirecting || busy}
            onClick={() => void continueWithGoogle()}
          >
            {redirecting ? <Spinner /> : <GoogleMark className="h-3.5 w-3.5" />}
            {redirecting ? "Redirecting to Google…" : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-2" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] text-ink-subtle">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 pt-3 pb-4">
          <div className="grid grid-cols-2 gap-0.5 rounded-sm border border-line bg-surface-raised p-0.5">
            {(["sign-in", "sign-up"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "h-6 rounded-xs text-[11px] font-medium transition-colors",
                  mode === value
                    ? "bg-surface-active text-ink"
                    : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                {value === "sign-in" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {mode === "sign-up" ? (
            <input
              type="text"
              autoComplete="name"
              placeholder="Your name"
              aria-label="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-8 w-full rounded-sm border border-line bg-surface-raised px-2.5 text-[12px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
            />
          ) : null}

          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-8 w-full rounded-sm border border-line bg-surface-raised px-2.5 text-[12px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-8 w-full rounded-sm border border-line bg-surface-raised px-2.5 text-[12px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="w-full"
            disabled={busy || redirecting}
          >
            {busy ? <Spinner className="border-t-white" /> : null}
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>

          <p className="text-[10px] leading-relaxed text-ink-subtle">
            Projects you already made stay on this device and are uploaded to your account when you
            sign in.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
