"use client";

import { Check, Link2, Play } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as React from "react";

import { Wordmark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import type { PublicProject } from "@/lib/projects/public-queries";

/**
 * Three.js, the device loader and the whole 3D stage are code-split here.
 *
 * A visitor gets HTML, the poster image and roughly nothing else until the
 * stage is actually needed — none of the editor's stores, panels, timeline or
 * keyframe machinery is in this bundle.
 */
const ViewerStage = dynamic(
  () => import("@/components/viewer/ViewerStage").then((module) => module.ViewerStage),
  { ssr: false },
);

/** Hydration never changes after it happens, so there is nothing to subscribe to. */
const subscribeNever = () => () => {};

interface PublicViewerProps {
  data: PublicProject;
  screenUrl: string | null;
}

/**
 * The public project page.
 *
 * Progressive by design: the poster frame paints first and stays until the 3D
 * stage says it is ready, so the page is never blank and never flashes. The
 * animation then starts on its own — this is a finished piece of work someone
 * was sent, not something to operate.
 */
export function PublicViewer({ data, screenUrl }: PublicViewerProps) {
  const [stageReady, setStageReady] = React.useState(false);
  const [playing, setPlaying] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  // The stage only mounts after hydration, so the server-rendered HTML is the
  // poster and the layout never shifts when 3D arrives. `useSyncExternalStore`
  // rather than an effect: it gives the server a different snapshot by design,
  // which is exactly the question being asked.
  const mounted = React.useSyncExternalStore(subscribeNever, () => true, () => false);

  const aspect = data.project.canvas.width / data.project.canvas.height;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the address bar still has the link */
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between px-5">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>

        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          {copied ? <Check className="h-3 w-3 text-positive" /> : <Link2 className="h-3 w-3" />}
          {copied ? "Copied" : "Share"}
        </button>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-5 pb-6">
        <div className="w-full max-w-5xl">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-lg border border-line bg-canvas shadow-2xl shadow-black/40"
            style={{ aspectRatio: aspect }}
          >
            {/* Poster: painted immediately, faded out once the stage is live. */}
            {data.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnailUrl}
                alt=""
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                  stageReady ? "opacity-0" : "opacity-100",
                )}
              />
            ) : null}

            {mounted ? (
              <div
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  stageReady ? "opacity-100" : "opacity-0",
                )}
              >
                <ViewerStage
                  project={data.project}
                  screenUrl={screenUrl}
                  playing={playing}
                  onReady={() => setStageReady(true)}
                />
              </div>
            ) : null}

            {!stageReady ? (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] text-white/70 backdrop-blur-sm">
                  Loading…
                </span>
              </div>
            ) : null}

            {/*
              Autoplay needs no interaction here — there is no audio, so no
              browser blocks it. The control is a pause, offered only once the
              animation is actually running.
            */}
            {stageReady ? (
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "Pause" : "Play"}
                className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/80 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:hover:opacity-100"
              >
                {playing ? (
                  <span className="flex gap-[3px]">
                    <span className="h-3 w-[3px] rounded-full bg-current" />
                    <span className="h-3 w-[3px] rounded-full bg-current" />
                  </span>
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>

          <div className="mx-auto mt-5 max-w-2xl text-center">
            <h1 className="text-[18px] font-medium tracking-[-0.01em] text-ink">{data.name}</h1>
            {data.description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{data.description}</p>
            ) : null}
            {data.author.name || data.author.username ? (
              <p className="mt-2 text-[11px] text-ink-subtle">
                by{" "}
                {data.author.username ? (
                  <Link href={`/u/${data.author.username}`} className="text-ink-muted hover:text-ink">
                    {data.author.name ?? data.author.username}
                  </Link>
                ) : (
                  data.author.name
                )}
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="flex h-12 shrink-0 items-center justify-center">
        <Link
          href="/"
          className="text-[11px] text-ink-subtle transition-colors hover:text-ink-muted"
        >
          Created with Framelo
        </Link>
      </footer>
    </div>
  );
}
