"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  getPortfolioEntry,
  publishToPortfolio,
  unpublishFromPortfolio,
  type PortfolioEntry,
} from "@/lib/projects/portfolio-service";
import { slugify } from "@/lib/slug";
import { notify } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import type { Project } from "@/types/project";

interface PublishDialogProps {
  /** `null` closes the dialog. */
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

/**
 * Publish a project to the portfolio.
 *
 * The title, description and slug are the portfolio's own, not the project's —
 * work is often named "test 4" while it is being made, and the published piece
 * needs a presentable identity that can change without renaming the project.
 */
export function PublishDialog({ project, onOpenChange, onChanged }: PublishDialogProps) {
  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add to portfolio"
        description={project ? project.name : ""}
        style={{ ["--dialog-width" as string]: "500px" }}
      >
        {/* Keyed by project, so opening a different one never shows the
            previous project's title for a frame. */}
        {project ? (
          <PublishForm
            key={project.id}
            project={project}
            onOpenChange={onOpenChange}
            onChanged={onChanged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PublishForm({
  project,
  onOpenChange,
  onChanged,
}: {
  project: Project;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const available = useAuthStore((state) => state.available);
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const username = useAuthStore((state) => state.profile?.username ?? null);

  const [entry, setEntry] = React.useState<PortfolioEntry | null>(null);
  // Seeded from the project; an existing publication overwrites them below.
  const [title, setTitle] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description ?? "");
  const [slug, setSlug] = React.useState(() => slugify(project.name));
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [loading, setLoading] = React.useState(authenticated);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!authenticated) return;

    let cancelled = false;

    async function load() {
      try {
        const result = await getPortfolioEntry(project);
        if (cancelled || !result) return;

        setEntry(result);
        setTitle(result.title);
        setDescription(result.description ?? "");
        setSlug(result.slug);
        setSlugTouched(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [project, authenticated]);

  // Derived rather than synced: the slug follows the title until the user
  // edits it, which needs no effect and cannot fall out of step.
  const effectiveSlug = slugTouched ? slug : slugify(title);

  async function publish() {
    setBusy(true);

    try {
      const result = await publishToPortfolio(project, {
        title,
        description,
        slug: effectiveSlug,
      });
      setEntry(result);
      onChanged?.();
      notify.success("Published to portfolio", result.title);
    } catch (error) {
      notify.error(
        "Could not publish",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);

    try {
      await unpublishFromPortfolio(project);
      setEntry(entry ? { ...entry, isPublished: false } : null);
      onChanged?.();
      notify.info("Removed from portfolio");
    } catch (error) {
      notify.error("Could not unpublish", error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const publicPath = username ? `/u/${username}` : "/portfolio";

  return (
    <>
      <div className="space-y-4 px-5 py-4">
        {!available ? (
          <Alert tone="info" title="Portfolios need a backend">
            This deployment has no Supabase project configured. The editor and local projects work
            as normal.
          </Alert>
        ) : !authenticated ? (
          <Alert tone="info" title="Sign in to publish">
            A portfolio lives under your profile, so it needs an account.
          </Alert>
        ) : loading ? (
          <div className="flex items-center gap-2 py-4 text-[11px] text-ink-subtle">
            <Spinner /> Loading…
          </div>
        ) : (
          <>
            <Field label="Title" value={title} onChange={setTitle} />

            <div className="space-y-1.5">
              <label htmlFor="portfolio-description" className="panel-label block">
                Description
              </label>
              <textarea
                id="portfolio-description"
                rows={3}
                value={description}
                placeholder="What is this piece of work?"
                onChange={(event) => setDescription(event.target.value)}
                className="w-full resize-y rounded-sm border border-line bg-surface-raised px-2.5 py-2 text-[12px] leading-relaxed text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="portfolio-slug" className="panel-label block">
                Link
              </label>
              <div className="flex items-center rounded-sm border border-line bg-surface-raised focus-within:border-accent/60">
                <span className="numeric shrink-0 pl-2.5 text-[11px] text-ink-subtle">
                  {publicPath}/
                </span>
                <input
                  id="portfolio-slug"
                  value={effectiveSlug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(slugify(event.target.value));
                  }}
                  className="numeric h-8 min-w-0 flex-1 bg-transparent px-1 text-[11px] text-ink focus:outline-none"
                />
              </div>
            </div>

            {!username ? (
              <Alert tone="warning" title="Pick a username first">
                Your portfolio needs a username before it has a public address. Published work is
                still visible under Discover.
              </Alert>
            ) : null}

            <p className="text-[10px] leading-relaxed text-ink-subtle">
              Publishing makes this project readable by anyone with its link, and lists it on your
              portfolio. You can remove it at any time.
            </p>
          </>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-raised/40 px-5 py-3">
        {entry?.isPublished ? (
          <Button variant="ghost" size="sm" onClick={() => void unpublish()} disabled={busy}>
            Remove from portfolio
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void publish()}
            disabled={busy || !authenticated || !title.trim()}
          >
            {busy ? <Spinner className="border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
            {entry?.isPublished ? "Update" : "Publish"}
          </Button>
        </div>
      </footer>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="panel-label block">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-sm border border-line bg-surface-raised px-2.5 text-[12px] text-ink focus:border-accent/60 focus:outline-none"
      />
    </div>
  );
}
