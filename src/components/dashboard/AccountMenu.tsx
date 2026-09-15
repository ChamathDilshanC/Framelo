"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AuthDialog } from "@/components/auth/AuthDialog";
import { SignOutConfirm } from "@/components/auth/SignOutConfirm";
import { Button } from "@/components/ui/button";
import { ImportLocalProjectsDialog } from "@/components/dashboard/ImportLocalProjectsDialog";
import { listUnsyncedProjects } from "@/lib/projects/project-service";
import { useAuthStore } from "@/store/auth-store";
import type { ProjectSummary } from "@/types/project";

/**
 * Sign in, sign out, and nothing else.
 *
 * Auth is not a gate in Framelo — the editor works signed out — so this is a
 * small affordance in the header rather than a wall in front of the product.
 * Signing in uploads whatever was made as a guest, because losing that work at
 * the sign-in boundary would be the worst possible moment to lose it.
 */
export function AccountMenu() {
  const available = useAuthStore((state) => state.available);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const [pendingImport, setPendingImport] = React.useState<ProjectSummary[]>([]);
  const [importOpen, setImportOpen] = React.useState(false);
  /** Declining once should not mean being asked again on the next render. */
  const asked = React.useRef(false);

  // Guest work is offered to the account, not taken by it.
  React.useEffect(() => {
    if (status !== "authenticated" || asked.current) return;
    asked.current = true;

    void listUnsyncedProjects().then((projects) => {
      if (projects.length === 0) return;
      setPendingImport(projects);
      setImportOpen(true);
    });
  }, [status]);

  React.useEffect(() => {
    if (!menuOpen) return;

    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  if (!available) return null;

  if (status !== "authenticated") {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Sign in
        </Button>
        <AuthDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const label = profile?.display_name ?? user?.email ?? "Account";
  const avatar = profile?.avatar_url ?? null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        aria-expanded={menuOpen}
        className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-raised text-[11px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        aria-label="Account"
      >
        <Avatar key={avatar ?? "initial"} url={avatar} label={label} />
      </button>

      {menuOpen ? (
        <div className="animate-fade-up absolute top-full right-0 z-40 mt-1 w-52 overflow-hidden rounded-md border border-line-strong bg-surface py-1 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-raised text-[11px] text-ink-muted">
              <Avatar key={avatar ?? "initial"} url={avatar} label={label} />
            </span>
            <div className="min-w-0">
            <p className="truncate text-[12px] text-ink">{label}</p>
            {profile?.username ? (
              <p className="truncate text-[10px] text-ink-subtle">@{profile.username}</p>
            ) : user?.email && user.email !== label ? (
              <p className="truncate text-[10px] text-ink-subtle">{user.email}</p>
            ) : null}
            </div>
          </div>
          <span className="my-1 block h-px bg-line" />

          {profile?.username ? (
            <Link
              href={`/u/${profile.username}`}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-[12px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <User className="h-3 w-3" />
              My portfolio
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmingSignOut(true);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      ) : null}

      <SignOutConfirm open={confirmingSignOut} onOpenChange={setConfirmingSignOut} />

      {pendingImport.length > 0 ? (
        <ImportLocalProjectsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          projects={pendingImport}
          onImported={() => setPendingImport([])}
        />
      ) : null}
    </div>
  );
}

/**
 * A profile picture, or the initial when there is not one.
 *
 * A plain `img`: the URL comes from whichever provider signed the user in, so
 * the host is not known ahead of time and cannot be declared for the image
 * optimiser. A failed load falls back to the initial rather than leaving a
 * broken image where a face should be — third-party avatar URLs do expire.
 */
function Avatar({ url, label }: { url: string | null; label: string }) {
  const [failed, setFailed] = React.useState(false);

  if (!url || failed) return <>{label.slice(0, 1).toUpperCase()}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
