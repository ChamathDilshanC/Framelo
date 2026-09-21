import {
  ArrowUpRight,
  Boxes,
  Clapperboard,
  Gauge,
  ImageDown,
  Layers,
  MousePointerClick,
  Play,
  Sparkles,
} from "lucide-react";

import { Wordmark } from "@/components/brand/Logo";
import { HeroPreviewLoader } from "@/components/landing/HeroPreviewLoader";
import { ProjectLauncher } from "@/components/landing/ProjectLauncher";
import { APP_TAGLINE } from "@/lib/constants";

const FEATURES = [
  {
    icon: Boxes,
    title: "Photoreal device scenes",
    body: "Place your work inside iPhone, iPad and MacBook compositions with editable finishes, lighting and camera views.",
  },
  {
    icon: Clapperboard,
    title: "Motion that feels intentional",
    body: "Animate position, rotation, scale and opacity on a real keyframe timeline with easing and precise scrubbing.",
  },
  {
    icon: MousePointerClick,
    title: "A studio that stays direct",
    body: "Drag, tune and preview the scene without leaving the canvas. Every control is connected to the composition.",
  },
  {
    icon: Layers,
    title: "Templates, not dead ends",
    body: "Start from responsive mobile, tablet, laptop or multi-device scenes, then edit every layer to make it yours.",
  },
  {
    icon: ImageDown,
    title: "From screen to showcase",
    body: "Drop in image or video media, fit it to each screen and export the finished frame or motion piece.",
  },
  {
    icon: Gauge,
    title: "Local-first by design",
    body: "Your projects save in the browser as you work. No account or backend is required to make something beautiful.",
  },
];

const STEPS = [
  ["01", "Bring your screen", "Upload a PNG, JPG, WebP, MP4 or WebM into the asset library."],
  ["02", "Build the scene", "Choose a device, template, background and camera view."],
  ["03", "Add the motion", "Key values, shape the timing and preview the complete composition."],
  ["04", "Share the result", "Export a still or video, then publish when the piece is ready."],
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-canvas">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-[12px] text-ink-muted md:flex">
            <a href="#workflow" className="transition-colors hover:text-ink">Workflow</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#templates" className="transition-colors hover:text-ink">Templates</a>
          </nav>
          <a
            href="/dashboard"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[12px] font-medium text-canvas transition-transform hover:-translate-y-0.5"
          >
            Open studio
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main>
        <section className="relative isolate min-h-[760px] overflow-hidden border-b border-line">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent_34%),radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--color-accent)_8%,transparent),transparent_30%)]" />
          <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-8 px-6 pb-14 pt-28 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pt-20">
            <div className="relative z-10 max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[11px] text-ink-muted backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Device mockup &amp; animation studio
              </div>
              <h1 className="max-w-[620px] text-[clamp(3.5rem,8vw,7.3rem)] leading-[0.88] font-semibold tracking-[-0.065em] text-ink">
                Make your
                <br />
                work <span className="text-accent">move.</span>
              </h1>
              <p className="mt-8 max-w-md text-[15px] leading-7 text-ink-muted">
                Framelo turns a flat screen into a finished product story. Build a
                photoreal device scene, animate it on a real timeline and export
                something worth showing.
              </p>
              <div className="mt-8">
                <ProjectLauncher />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-[11px] text-ink-subtle">
                <span className="rounded-full border border-line px-3 py-1.5">Runs in your browser</span>
                <span className="rounded-full border border-line px-3 py-1.5">No account required</span>
                <span className="rounded-full border border-line px-3 py-1.5">WebGL2</span>
              </div>
            </div>

            <div className="relative mx-auto h-[520px] w-full max-w-[660px] lg:h-[680px]">
              <div aria-hidden className="absolute inset-[15%] rounded-full bg-accent/15 blur-[90px]" />
              <div className="absolute inset-0 rounded-[32px] border border-line/70 bg-surface/20 shadow-2xl shadow-black/20 backdrop-blur-[2px]" />
              <div className="absolute inset-3 overflow-hidden rounded-[26px]">
                <HeroPreviewLoader />
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-[11px] text-white/70 backdrop-blur-md">
                <span className="flex items-center gap-2"><Play className="h-3 w-3 fill-current text-accent" /> Live scene preview</span>
                <span>iPhone 15 Pro Max · 60 fps</span>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-line">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="panel-label">The Framelo loop</p>
                <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-[-0.04em] text-ink">
                  From first upload to final frame.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-ink-muted">{APP_TAGLINE} The complexity stays inside the product.</p>
            </div>
            <ol className="grid overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
              {STEPS.map(([number, title, body]) => (
                <li key={number} className="border-b border-line bg-surface p-6 last:border-0 md:border-b-0 md:border-r md:last:border-0">
                  <span className="numeric text-accent">{number}</span>
                  <h3 className="mt-8 text-sm font-medium text-ink">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="border-b border-line">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
            <div className="mb-10 max-w-xl">
              <p className="panel-label">Inside the studio</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
                Everything you need to make the frame feel real.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="bg-surface p-6 transition-colors hover:bg-surface-hover">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-raised">
                    <feature.icon className="h-4 w-4 text-accent" />
                  </span>
                  <h3 className="mt-6 text-sm font-medium text-ink">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-20 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div className="max-w-xl">
              <p className="panel-label">Start with momentum</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">A better first frame is already waiting.</h2>
              <p className="mt-4 text-sm leading-6 text-ink-muted">
                Explore mobile, tablet, laptop and multi-device templates, then replace every screen, layer and motion track with your own.
              </p>
            </div>
            <a href="/dashboard" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover">
              Explore templates
              <Sparkles className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <Wordmark showTagline />
        <p className="text-[11px] text-ink-subtle">Projects and media stay local in your browser by default.</p>
      </footer>
    </div>
  );
}
