"use client";

import { Check, Copy, ExternalLink, Globe, Lock } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  disableSharing,
  enableSharing,
  getShareState,
  ShareUnavailableError,
  type ShareState,
} from "@/lib/projects/share-service";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Project } from "@/types/project";

interface ShareDialogProps {
  /** `null` closes the dialog. */
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

/**
 * Share a project.
 *
 * The token is created once and then reused for the life of the project: a link
 * someone already sent must keep working, so re-opening this dialog reads the
 * existing share rather than minting a new one.
 */
export function ShareDialog({ project, onOpenChange, onChanged }: ShareDialogProps) {
  const available = useAuthStore((state) => state.available);
  const authenticated = useAuthStore((state) => state.status === "authenticated");

  const [state, setState] = React.useState<ShareState | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!project || !authenticated) {
        if (!cancelled) setState(null);
        return;
      }

      // Reads the existing share rather than creating one: a link that has
      // already been sent has to keep working.
      const result = await getShareState(project);
      if (!cancelled) setState(result);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [project, authenticated]);

  async function setVisibility(next: "private" | "link") {
    if (!project) return;
    setBusy(true);

    try {
      const result = next === "link" ? await enableSharing(project) : await disableSharing(project);
      setState(result);
      onChanged?.();
      notify.success(next === "link" ? "Project is shareable" : "Sharing turned off");
    } catch (error) {
      notify.error(
        "Could not update sharing",
        error instanceof ShareUnavailableError
          ? error.message
          : error instanceof Error
            ? error.message
            : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!state?.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      notify.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Clipboard unavailable", "Select the link and copy it manually.");
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title="Share project"
        description={project ? project.name : ""}
        style={{ ["--dialog-width" as string]: "480px" }}
      >
        <div className="space-y-4 px-5 py-4">
          {!available ? (
            <Alert tone="info" title="Sharing needs a backend">
              This deployment has no Supabase project configured, so links cannot be published.
              Everything else keeps working locally.
            </Alert>
          ) : !authenticated ? (
            <Alert tone="info" title="Sign in to share">
              A public link needs an account, so the project has somewhere to live that isn&apos;t
              this browser.
            </Alert>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="panel-label">Visibility</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <VisibilityOption
                    icon={Lock}
                    label="Private"
                    detail="Only you can open it"
                    active={state?.visibility === "private"}
                    disabled={busy}
                    onSelect={() => void setVisibility("private")}
                  />
                  <VisibilityOption
                    icon={Globe}
                    label="Anyone with link"
                    detail="Opens without an account"
                    active={state?.visibility === "link"}
                    disabled={busy}
                    onSelect={() => void setVisibility("link")}
                  />
                </div>
              </div>

              {state?.url ? (
                <div className="space-y-1.5">
                  <span className="panel-label">Public link</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      readOnly
                      value={state.url}
                      aria-label="Public link"
                      onFocus={(event) => event.currentTarget.select()}
                      className="numeric h-8 min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-2 text-[11px] text-ink-muted focus:border-accent/60 focus:outline-none"
                    />
                    <Button size="sm" variant="primary" onClick={() => void copy()}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={state.url} target="_blank" rel="noreferrer" aria-label="Open link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-ink-subtle">
                    The link plays the animation automatically. Turning sharing off revokes it
                    immediately.
                  </p>
                </div>
              ) : state === null && authenticated ? (
                <div className="flex items-center gap-2 py-2 text-[11px] text-ink-subtle">
                  <Spinner /> Checking share status…
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="flex justify-end border-t border-line bg-surface-raised/40 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function VisibilityOption({
  icon: Icon,
  label,
  detail,
  active,
  disabled,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-sm border px-2.5 py-2 text-left transition-colors duration-150 disabled:opacity-50",
        active
          ? "border-accent/60 bg-accent-soft"
          : "border-line bg-surface-raised hover:border-line-strong",
      )}
    >
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="mt-0.5 block text-[10px] text-ink-subtle">{detail}</span>
    </button>
  );
}
