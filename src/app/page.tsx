import { Boxes, Clapperboard, Gauge, ImageDown, Layers, MousePointerClick } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { HeroPreviewLoader } from "@/components/landing/HeroPreviewLoader";
import { ProjectLauncher } from "@/components/landing/ProjectLauncher";
import { APP_TAGLINE } from "@/lib/constants";

const FEATURES = [
  {
    icon: Boxes,
    title: "Data-driven devices",
    body: "Every device is a definition file with its own screen, camera and proportions. Adding one never touches the renderer.",
  },
  {
    icon: Clapperboard,
    title: "Real keyframe engine",
    body: "Position, rotation, scale and opacity each own a track. The playhead is the single source of truth for every value on screen.",
  },
  {
    icon: MousePointerClick,
    title: "Direct manipulation",
    body: "Scrub numbers, drag keyframes, orbit the camera. Every control is wired to the scene — nothing is a placeholder.",
  },
  {
    icon: Layers,
    title: "Serializable projects",
    body: "Versioned, validated project JSON that autosaves as you work and reloads exactly as you left it.",
  },
  {
    icon: ImageDown,
    title: "True-to-viewport export",
    body: "Exports render the live scene at up to 4K, with optional transparency. What you frame is what you get.",
  },
  {
    icon: Gauge,
    title: "Built to stay fast",
    body: "Cached textures, imperative animation updates and debounced saves keep playback smooth while you edit.",
  },
];

const STEPS = [
  { step: "01", title: "Upload", body: "Drop a PNG, JPG or WebP screenshot into the asset library." },
  { step: "02", title: "Place", body: "It lands on the device screen instantly, cropped to fit." },
  { step: "03", title: "Animate", body: "Key a couple of values and let the engine interpolate." },
  { step: "04", title: "Export", body: "Render the frame at 720p through 4K and download it." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <nav className="flex items-center gap-6 text-[12px] text-ink-muted">
            <a href="#workflow" className="transition-colors hover:text-ink">
              Workflow
            </a>
            <a href="#features" className="hidden transition-colors hover:text-ink sm:inline">
              Features
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="aurora relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
            <div className="animate-fade-up space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[11px] text-ink-muted backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Device mockup &amp; animation studio
              </span>

              <h1 className="text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-ink">
                Create.
                <br />
                Animate.
                <br />
                <span className="text-accent">Showcase.</span>
              </h1>

              <p className="max-w-lg text-[15px] leading-relaxed text-ink-muted">
                Framelo turns a flat screenshot into a moving product shot. Place your design on a
                3D device, animate it with a real keyframe timeline, and export a finished frame —
                all in the browser, with nothing to install.
              </p>

              <ProjectLauncher />
            </div>

            <div className="relative aspect-square w-full lg:aspect-[4/5]">
              <div
                aria-hidden
                className="absolute inset-8 rounded-full bg-accent/10 blur-3xl"
              />
              <HeroPreviewLoader />
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 max-w-xl space-y-3">
              <p className="panel-label">The loop</p>
              <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                Upload, place, animate, export
              </h2>
              <p className="text-[14px] leading-relaxed text-ink-muted">
                {APP_TAGLINE} Four steps, no 3D knowledge required — the complexity stays inside the
                product.
              </p>
            </div>

            <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((item) => (
                <li key={item.step} className="bg-surface p-6">
                  <span className="numeric text-accent">{item.step}</span>
                  <h3 className="mt-3 text-[14px] font-medium text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 max-w-xl space-y-3">
              <p className="panel-label">Under the hood</p>
              <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                A studio foundation, not a demo
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-lg border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-strong"
                >
                  <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-raised">
                    <feature.icon className="h-4 w-4 text-accent" />
                  </span>
                  <h3 className="text-[14px] font-medium text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark showTagline />
        <p className="text-[11px] text-ink-subtle">
          Projects and media are stored locally in your browser in this version.
        </p>
      </footer>
    </div>
  );
}
