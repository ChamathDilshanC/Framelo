"use client";

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";

import { AccountIdentity } from "@/components/auth/AccountIdentity";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { SignOutConfirm } from "@/components/auth/SignOutConfirm";
import { GoogleMark } from "@/components/brand/GoogleMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";

/**
 * App settings.
 *
 * Deliberately separate from the editor's "Composition settings": that popover
 * edits the project — canvas size, frame rate, duration — and lives in the
 * project file. These are preferences about Framelo itself, follow the person
 * rather than the project, and never mark anything unsaved.
 *
 * Account comes first now. It is the thing people open this dialog to check —
 * "am I signed in, and as whom" — and it was previously a sentence at the
 * bottom under the theme switcher.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Settings"
        description="Preferences for Framelo. These follow you, not the project."
        style={{ ["--dialog-width" as string]: "440px" }}
      >
        <div className="divide-y divide-line">
          <AccountSetting onSignedOut={() => onOpenChange(false)} />
          <ThemeSetting />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The account, from anywhere.
 *
 * Shown signed in *and* signed out. An Account heading that simply vanished
 * for a guest left no way to tell whether Framelo had forgotten the session or
 * had never been told about it — and settings is the only account surface the
 * editor has, since the avatar menu lives on the dashboard.
 *
 * Hidden only when there is no Supabase project at all, where an account is
 * not a concept.
 */
function AccountSetting({ onSignedOut }: { onSignedOut: () => void }) {
  const available = useAuthStore((state) => state.available);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const [confirming, setConfirming] = React.useState(false);
  const [signingIn, setSigningIn] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  if (!available) return null;

  const authenticated = status === "authenticated";

  return (
    <section className="space-y-3 px-5 py-4">
      <h3 className="panel-label">Account</h3>

      {status === "loading" ? (
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-raised px-3 py-3">
          <Spinner />
          <span className="text-[12px] text-ink-muted">Checking your session…</span>
        </div>
      ) : authenticated ? (
        <div className="space-y-2.5 rounded-md border border-line bg-surface-raised p-3">
          <AccountIdentity
            // Nothing here is hard-coded or guessed. The name is the profile
            // row the provider's identity was adopted into, the email is the
            // session's, and the picture is whichever URL Google actually sent.
            name={profile?.display_name ?? null}
            email={user?.email ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            provider={providerOf(user)}
          />

          {profile?.username ? (
            <p className="text-[10px] text-ink-subtle">
              Portfolio at <span className="text-ink-muted">@{profile.username}</span>
            </p>
          ) : null}

          {/* Directly under the identity, as its own row: signing out is about
              this person, and any distance between the two makes it look like
              a general app action. */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setConfirming(true)}
            aria-label="Sign out"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-md border border-line bg-surface-raised p-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Guest mode</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
              Your projects are saved locally. Sign in to sync them to your account and share
              them.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={redirecting}
            onClick={async () => {
              setRedirecting(true);
              try {
                await signInWithGoogle();
              } catch {
                // The store surfaces its own error; this only has to release
                // the button so the person can try again.
                setRedirecting(false);
              }
            }}
          >
            {redirecting ? <Spinner /> : <GoogleMark className="h-3.5 w-3.5" />}
            Sign in with Google
          </Button>

          <button
            type="button"
            onClick={() => setSigningIn(true)}
            className="w-full text-center text-[10px] text-ink-subtle transition-colors hover:text-ink-muted"
          >
            Or use an email address
          </button>
        </div>
      )}

      <SignOutConfirm
        open={confirming}
        onOpenChange={setConfirming}
        // Only on a real sign-out: cancelling must leave settings open, where
        // the user was.
        onSignedOut={onSignedOut}
      />
      <AuthDialog open={signingIn} onOpenChange={setSigningIn} />
    </section>
  );
}

/**
 * Which service signed this person in.
 *
 * `app_metadata.provider` is the one Supabase sets; `identities` is the list
 * when an account has been linked to more than one. Reading both means a
 * Google-then-email account still says Google rather than nothing.
 */
function providerOf(user: { app_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;

  const direct = user.app_metadata?.provider;
  if (typeof direct === "string" && direct) return direct;

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && typeof providers[0] === "string") return providers[0];

  return null;
}

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "system", label: "System", detail: "Follow the OS", icon: Monitor },
  { value: "dark", label: "Dark", detail: "Best for artwork", icon: Moon },
  { value: "light", label: "Light", detail: "Bright rooms", icon: Sun },
];

function ThemeSetting() {
  const preference = useThemeStore((state) => state.preference);
  const theme = useThemeStore((state) => state.theme);
  const hydrated = useThemeStore((state) => state.hydrated);
  const hydrate = useThemeStore((state) => state.hydrate);
  const setPreference = useThemeStore((state) => state.setPreference);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <section className="space-y-2 px-5 py-4">
      <div className="space-y-0.5">
        <h3 className="panel-label">Appearance</h3>
        <p className="text-[11px] text-ink-subtle">
          Changes the interface only. A project&apos;s own background is part of the composition and
          is never affected.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="grid grid-cols-3 gap-1.5"
        // Until the store has read what the inline script painted, the
        // selection would be a guess — better to show it a beat late than wrong.
        aria-busy={!hydrated}
      >
        {OPTIONS.map((option) => {
          const active = hydrated && preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(option.value)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-md border px-2.5 py-2.5 text-left transition-colors duration-150",
                active
                  ? "border-accent/60 bg-accent-soft"
                  : "border-line bg-surface-raised hover:border-line-strong hover:bg-surface-hover",
              )}
            >
              <option.icon
                className={cn("h-3.5 w-3.5", active ? "text-accent" : "text-ink-subtle")}
              />
              <span className="block text-[12px] font-medium text-ink">{option.label}</span>
              <span className="block text-[10px] leading-snug text-ink-subtle">
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>

      {hydrated && preference === "system" ? (
        <p className="text-[10px] text-ink-subtle">
          Following your system, currently {theme}. It will switch on its own when your system does.
        </p>
      ) : null}
    </section>
  );
}
