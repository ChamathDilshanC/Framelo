"use client";

import * as React from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const POSTER_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

function ArrowIcon() {
  return <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.6} />;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const firstVideo = React.useRef<HTMLVideoElement>(null);
  const secondVideo = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const current = firstVideo.current;
    const next = secondVideo.current;
    if (!current || !next || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current?.pause();
      next?.pause();
      return;
    }

    let active = current;
    let standby = next;
    let swapping = false;

    const play = (video: HTMLVideoElement) => {
      void video.play().catch(() => undefined);
    };
    const tick = () => {
      if (swapping || !active.duration || active.duration - active.currentTime > 0.9) return;
      swapping = true;
      const outgoing = active;
      standby.currentTime = 0;
      play(standby);
      standby.classList.add("is-active");
      outgoing.classList.remove("is-active");
      [active, standby] = [standby, outgoing];
      window.setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
        swapping = false;
      }, 1000);
    };

    current.addEventListener("timeupdate", tick);
    next.addEventListener("timeupdate", tick);
    play(current);
    return () => {
      current.removeEventListener("timeupdate", tick);
      next.removeEventListener("timeupdate", tick);
    };
  }, []);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-menu-root]")) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <main className="framelo-hero">
      <div
        className="framelo-hero__background"
        role="img"
        aria-label="Animated abstract orbital artwork"
      >
        <video
          ref={firstVideo}
          className="framelo-hero__video is-active"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER_URL}
          aria-hidden
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <video
          ref={secondVideo}
          className="framelo-hero__video"
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER_URL}
          aria-hidden
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>

      <header className="framelo-hero__nav" data-menu-root>
        <Link href="/" className="framelo-hero__logo" aria-label="Framelo home">
          <span className="framelo-hero__logo-mark" aria-hidden>
            <span />
          </span>
          FRAMELO
        </Link>
        <nav className="framelo-hero__links" aria-label="Primary">
          <a href="#workflow">Workflow</a>
          <a href="#features">Features</a>
          <a href="/dashboard">Studio</a>
          <a href="/portfolio">Showcase</a>
        </nav>
        <div className="framelo-hero__actions">
          <a href="/dashboard" className="framelo-hero__login">Open studio</a>
          <a href="/dashboard" className="framelo-hero__nav-cta">Create a mockup <ArrowIcon /></a>
        </div>
        <button
          type="button"
          className="framelo-hero__burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        {menuOpen ? (
          <nav className="framelo-hero__mobile-menu" aria-label="Mobile">
            <a href="#workflow" onClick={() => setMenuOpen(false)}>Workflow</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="/portfolio">Showcase</a>
            <a href="/dashboard" className="framelo-hero__mobile-cta">Create a mockup <ArrowIcon /></a>
          </nav>
        ) : null}
      </header>

      <section className="framelo-hero__content" aria-labelledby="hero-title">
        <p className="framelo-hero__eyebrow">Create. Animate. Showcase.</p>
        <h1 id="hero-title">
          <span>Turn screens</span>
          <span>into stories.</span>
        </h1>
        <p className="framelo-hero__summary">
          Build polished device mockups in the browser. Place your work on a
          photoreal scene, animate every layer and export a finished frame.
        </p>
        <div className="framelo-hero__ctas">
          <a href="/dashboard" className="framelo-hero__primary">Start creating <ArrowIcon /></a>
          <a href="/portfolio" className="framelo-hero__secondary">Explore the showcase <ArrowIcon /></a>
        </div>
      </section>

      <div className="framelo-hero__hint" aria-hidden>
        <span className="framelo-hero__hint-line" />
        Scroll to explore
      </div>

      <section id="workflow" className="sr-only">
        <h2>Framelo workflow</h2>
        <p>Upload a screen, place it on a device, animate the scene and export the result.</p>
      </section>
      <section id="features" className="sr-only">
        <h2>Framelo features</h2>
        <p>Photoreal devices, real keyframes, editable templates and local-first projects.</p>
      </section>

      <style jsx>{`
        .framelo-hero {
          --hero-unit: min(calc(100vw / 1280), calc(100dvh / 760));
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          background: #050507;
          color: #fff;
          isolation: isolate;
          font-family: var(--framelo-font-sans), ui-sans-serif, system-ui, sans-serif;
        }
        .framelo-hero__background, .framelo-hero__video { position: absolute; inset: 0; }
        .framelo-hero__background { z-index: -2; background: #050507; }
        .framelo-hero__video { width: 100%; height: 100%; object-fit: cover; object-position: 51% 45%; opacity: 0; transition: opacity .9s linear; pointer-events: none; }
        .framelo-hero__video.is-active { opacity: 1; }
        .framelo-hero__background::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.72), transparent 66%), linear-gradient(0deg, rgba(0,0,0,.56), transparent 48%); pointer-events: none; }
        .framelo-hero__nav { position: absolute; inset: 0 0 auto; height: 74px; display: flex; align-items: center; gap: 30px; padding: 0 4vw; z-index: 3; }
        .framelo-hero__logo { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .18em; text-decoration: none; }
        .framelo-hero__logo-mark { display: grid; place-items: center; width: 23px; height: 23px; border: 1px solid rgba(255,255,255,.6); border-radius: 7px; }
        .framelo-hero__logo-mark span { width: 7px; height: 12px; border-radius: 2px; background: #a78bfa; }
        .framelo-hero__links { position: absolute; left: 50%; display: flex; gap: 28px; transform: translateX(-50%); }
        .framelo-hero__links a, .framelo-hero__login { color: rgba(255,255,255,.7); font-size: 12px; text-decoration: none; transition: color .2s; }
        .framelo-hero__links a:hover, .framelo-hero__login:hover { color: #fff; }
        .framelo-hero__actions { display: flex; align-items: center; gap: 9px; margin-left: auto; }
        .framelo-hero__nav-cta, .framelo-hero__primary { display: inline-flex; align-items: center; gap: 9px; border-radius: 999px; background: #fff; color: #09090b; text-decoration: none; font-size: 12px; font-weight: 600; }
        .framelo-hero__nav-cta { padding: 10px 15px; }
        .framelo-hero__content { position: absolute; top: 50%; left: 50%; width: min(650px, calc(100% - 48px)); transform: translate(-50%, -45%); text-align: center; }
        .framelo-hero__eyebrow { margin: 0 0 20px; color: rgba(255,255,255,.72); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }
        .framelo-hero__content h1 { margin: 0; font-size: clamp(54px, calc(91 * var(--hero-unit)), 116px); font-weight: 500; line-height: .94; letter-spacing: -.065em; }
        .framelo-hero__content h1 span { display: block; }
        .framelo-hero__content h1 span:last-child { color: #c4b5fd; }
        .framelo-hero__summary { max-width: 510px; margin: 24px auto 0; color: rgba(255,255,255,.86); font-size: clamp(15px, calc(17 * var(--hero-unit)), 18px); line-height: 1.55; }
        .framelo-hero__ctas { display: flex; justify-content: center; gap: 9px; margin-top: 27px; }
        .framelo-hero__primary, .framelo-hero__secondary { min-height: 43px; padding: 0 19px; }
        .framelo-hero__secondary { display: inline-flex; align-items: center; gap: 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(0,0,0,.48); color: rgba(255,255,255,.86); text-decoration: none; font-size: 12px; backdrop-filter: blur(8px); }
        .framelo-hero__hint { position: absolute; bottom: 28px; left: 4vw; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.54); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .framelo-hero__hint-line { display: block; width: 32px; height: 1px; background: rgba(255,255,255,.45); }
        .framelo-hero__burger, .framelo-hero__mobile-menu { display: none; }
        @media (prefers-reduced-motion: reduce) { .framelo-hero__video { transition: none; } }
        @media (max-width: 760px) {
          .framelo-hero { --hero-unit: 1px; }
          .framelo-hero__nav { height: 62px; padding: 0 20px; }
          .framelo-hero__links, .framelo-hero__actions { display: none; }
          .framelo-hero__burger { display: grid; place-items: center; width: 38px; height: 34px; margin-left: auto; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(0,0,0,.45); color: #fff; }
          .framelo-hero__burger svg { width: 16px; }
          .framelo-hero__mobile-menu { position: absolute; top: 58px; right: 16px; display: flex; width: min(290px, calc(100vw - 32px)); flex-direction: column; gap: 4px; padding: 9px; border: 1px solid rgba(255,255,255,.12); border-radius: 17px; background: rgba(8,8,10,.88); backdrop-filter: blur(22px); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
          .framelo-hero__mobile-menu a { padding: 12px; border-radius: 10px; color: rgba(255,255,255,.78); font-size: 14px; text-decoration: none; }
          .framelo-hero__mobile-menu a:hover { background: rgba(255,255,255,.08); color: #fff; }
          .framelo-hero__mobile-cta { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 5px; background: #fff; color: #09090b !important; }
          .framelo-hero__content { transform: translate(-50%, -48%); }
          .framelo-hero__content h1 { font-size: clamp(54px, 15vw, 82px); }
          .framelo-hero__summary { font-size: 15px; }
          .framelo-hero__ctas { flex-wrap: wrap; }
          .framelo-hero__hint { left: 20px; bottom: 20px; }
        }
        @media (max-width: 390px) { .framelo-hero__ctas { flex-direction: column; align-items: stretch; } .framelo-hero__primary, .framelo-hero__secondary { justify-content: center; } }
      `}</style>
    </main>
  );
}
