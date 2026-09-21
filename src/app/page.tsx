"use client";

import * as React from "react";
import { ArrowRight, Check, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
const POSTER_URL =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

const WORKFLOW = [
  ["01", "Bring your screen", "Drop a PNG, JPG, WebP, MP4 or WebM into the asset library."],
  ["02", "Build the scene", "Choose a device, template, background and camera view."],
  ["03", "Add the motion", "Key position, rotation, scale and opacity on the timeline."],
  ["04", "Share the result", "Export a still or video, then publish when it is ready."],
];

const FEATURES = [
  ["01", "Photoreal device scenes", "iPhone, iPad and MacBook models with independent screens, finishes and camera views."],
  ["02", "A real keyframe engine", "Scrub, ease and preview motion with tracks that stay editable from first frame to final export."],
  ["03", "Templates with a point of view", "Mobile, tablet, laptop and multi-device scenes that are starting points, never locked comps."],
  ["04", "Screen media that stays yours", "Tune fit, brightness, contrast and saturation for every screen independently."],
  ["05", "Local-first creative work", "Projects autosave to your browser, so the editor works signed out and offline."],
  ["06", "Export what you see", "Render stills or motion pieces with the same composition you built in the studio."],
];

const SHOWCASE = [
  { name: "Crimson Editorial", type: "Tablet scene", tone: "crimson", image: "/templates/studio/crimson-editorial.svg", copy: "A sculpted editorial frame for ideas with presence." },
  { name: "Midnight Sales", type: "Laptop scene", tone: "midnight", image: "/templates/studio/midnight-sales.svg", copy: "Burnt-orange momentum for a product story with depth." },
  { name: "Amber Agency", type: "Multi-device", tone: "amber", image: "/templates/studio/amber-agency.svg", copy: "Three independent screens, one coordinated campaign." },
  { name: "Lime Digital", type: "Multi-device", tone: "lime", image: "/templates/studio/lime-campaign.svg", copy: "A bright, expansive composition built to move." },
];

function ArrowIcon() {
  return <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.6} />;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const showcaseRail = React.useRef<HTMLDivElement>(null);
  const dragState = React.useRef({ startX: 0, startScrollLeft: 0 });
  const firstVideo = React.useRef<HTMLVideoElement>(null);
  const secondVideo = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const handleRailPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = showcaseRail.current;
    if (!rail) return;
    dragState.current = { startX: event.clientX, startScrollLeft: rail.scrollLeft };
    setIsDragging(true);
    rail.setPointerCapture(event.pointerId);
  };

  const handleRailPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = showcaseRail.current;
    if (!rail || !isDragging) return;
    rail.scrollLeft = dragState.current.startScrollLeft - (event.clientX - dragState.current.startX);
  };

  const stopRailDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (showcaseRail.current?.hasPointerCapture(event.pointerId)) {
      showcaseRail.current.releasePointerCapture(event.pointerId);
    }
  };

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
    const play = (video: HTMLVideoElement) => void video.play().catch(() => undefined);
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
    <main className="framelo-landing">
      <section className="framelo-hero">
        <div className="framelo-hero__background" aria-hidden>
          <video ref={firstVideo} className="framelo-hero__video is-active" autoPlay muted loop playsInline preload="auto" poster={POSTER_URL}>
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
          <video ref={secondVideo} className="framelo-hero__video" muted loop playsInline preload="auto" poster={POSTER_URL}>
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
        </div>
        <header className="framelo-hero__nav" data-menu-root>
          <Link href="/" className="framelo-hero__logo" aria-label="Framelo home"><span className="framelo-hero__logo-mark"><span /></span>FRAMELO</Link>
          <nav className="framelo-hero__links" aria-label="Primary">
            <a href="#workflow">Workflow</a><a href="#features">Features</a><a href="#showcase">Showcase</a>
          </nav>
          <div className="framelo-hero__actions"><a href="/dashboard">Open studio</a><a className="framelo-hero__nav-cta" href="/dashboard">Create a mockup <ArrowIcon /></a></div>
          <button type="button" className="framelo-hero__burger" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
          {menuOpen ? <nav className="framelo-hero__mobile-menu" aria-label="Mobile"><a href="#workflow" onClick={() => setMenuOpen(false)}>Workflow</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#showcase" onClick={() => setMenuOpen(false)}>Showcase</a><a href="/dashboard" className="framelo-hero__mobile-cta">Create a mockup <ArrowIcon /></a></nav> : null}
        </header>
        <div className="framelo-hero__content">
          <p className="framelo-hero__eyebrow">Create. Animate. Showcase.</p>
          <h1>Turn screens<span>into stories.</span></h1>
          <p className="framelo-hero__summary">Build polished device mockups in the browser. Place your work on a photoreal scene, animate every layer and export a finished frame.</p>
          <div className="framelo-hero__ctas"><a className="framelo-hero__primary" href="/dashboard">Start creating <ArrowIcon /></a><a className="framelo-hero__secondary" href="#workflow">Explore the workflow <ArrowIcon /></a></div>
        </div>
        <div className="framelo-hero__hint"><span /> Scroll to explore</div>
      </section>

      <section id="workflow" className="landing-section workflow-section" data-reveal>
        <div className="landing-shell">
          <div className="section-heading"><p className="section-kicker">The Framelo loop</p><h2>From first upload<br />to final frame.</h2><p>Four focused steps. No 3D knowledge required — the complexity stays inside the product.</p></div>
          <ol className="workflow-grid">{WORKFLOW.map(([number, title, copy]) => <li key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p><span className="step-arrow">↗</span></li>)}</ol>
        </div>
      </section>

      <section id="features" className="landing-section features-section" data-reveal>
        <div className="landing-shell"><div className="section-heading section-heading--wide"><p className="section-kicker">Inside the studio</p><h2>Everything you need<br /><em>to make it real.</em></h2><p>Framelo is a full creative loop, not a static mockup generator. Every layer remains yours to edit.</p></div><div className="feature-grid">{FEATURES.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p><Check aria-hidden /></article>)}</div></div>
      </section>

      <section id="showcase" className="landing-section showcase-section" data-reveal>
        <div className="landing-shell"><div className="showcase-heading"><div><p className="section-kicker">Made in Framelo</p><h2>Start with a strong<br /><em>point of view.</em></h2></div><a href="/portfolio">View full showcase <ArrowIcon /></a></div></div>
        <div className={`showcase-rail${isDragging ? " is-dragging" : ""}`} ref={showcaseRail} onPointerDown={handleRailPointerDown} onPointerMove={handleRailPointerMove} onPointerUp={stopRailDragging} onPointerCancel={stopRailDragging}>{SHOWCASE.map((item) => <article className={`showcase-card showcase-card--${item.tone}`} key={item.name}><div className="showcase-card__art"><Image src={item.image} alt={`${item.name} template preview`} fill sizes="(max-width: 760px) 78vw, 430px" /><span>{item.name.split(" ")[0]}</span><strong>{item.name.split(" ").slice(1).join(" ")}</strong></div><div className="showcase-card__meta"><span>{item.type}</span><h3>{item.name}</h3><p>{item.copy}</p></div></article>)}</div>
        <p className="rail-hint"><span /> Drag or scroll horizontally to explore</p>
      </section>

      <section className="landing-cta" data-reveal><div><p className="section-kicker">Your next frame</p><h2>Make something<br /><em>worth replaying.</em></h2></div><a href="/dashboard">Open Framelo <ArrowIcon /></a></section>

      <footer className="landing-footer"><div className="landing-footer__top"><Link href="/" className="framelo-hero__logo"><span className="framelo-hero__logo-mark"><span /></span>FRAMELO</Link><p>Create. Animate. Showcase.</p><a href="/dashboard">Start creating <ArrowIcon /></a></div><div className="landing-footer__bottom"><span>© 2026 Framelo. Built for better product stories.</span><nav><a href="#workflow">Workflow</a><a href="#features">Features</a><a href="#showcase">Showcase</a><a href="/portfolio">Portfolio</a></nav><span>Local-first · Browser-based</span></div></footer>

      <style jsx>{`
        .framelo-landing { overflow-x: hidden; background: #08080a; color: #f5f5f7; font-family: var(--framelo-font-sans), ui-sans-serif, system-ui, sans-serif; user-select: none; -webkit-user-select: none; }
        .framelo-hero { position: relative; min-height: 100dvh; overflow: hidden; isolation: isolate; }
        .framelo-hero__background, .framelo-hero__video { position: absolute; inset: 0; }
        .framelo-hero__background { z-index: -2; background: #050507; }
        .framelo-hero__video { width: 100%; height: 100%; object-fit: cover; object-position: 51% 45%; opacity: 0; transition: opacity .9s linear; pointer-events: none; }
        .framelo-hero__video.is-active { opacity: 1; }
        .framelo-hero__background::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.7), transparent 72%), linear-gradient(0deg, rgba(0,0,0,.6), transparent 52%); }
        .framelo-hero__nav { position: absolute; inset: 0 0 auto; height: 74px; display: flex; align-items: center; gap: 30px; padding: 0 4vw; z-index: 3; }
        .framelo-hero__logo { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .18em; text-decoration: none; }
        .framelo-hero__logo-mark { display: grid; place-items: center; width: 23px; height: 23px; border: 1px solid rgba(255,255,255,.6); border-radius: 7px; }
        .framelo-hero__logo-mark span { width: 7px; height: 12px; border-radius: 2px; background: #a78bfa; }
        .framelo-hero__links { position: absolute; left: 50%; display: flex; gap: 28px; transform: translateX(-50%); }
        .framelo-hero__links a, .framelo-hero__actions > a:first-child { color: rgba(255,255,255,.72); font-size: 12px; text-decoration: none; }
        .framelo-hero__links a:hover, .framelo-hero__actions > a:first-child:hover { color: #fff; }
        .framelo-hero__actions { display: flex; align-items: center; gap: 12px; margin-left: auto; }
        .framelo-hero__nav-cta, .framelo-hero__primary, .landing-cta > a { display: inline-flex; align-items: center; gap: 9px; border-radius: 999px; background: #fff; color: #09090b; text-decoration: none; font-size: 12px; font-weight: 600; }
        .framelo-hero__nav-cta { padding: 10px 15px; }
        .framelo-hero__content { position: absolute; top: 50%; left: 50%; width: min(650px, calc(100% - 48px)); transform: translate(-50%, -45%); text-align: center; }
        .framelo-hero__eyebrow, .section-kicker { margin: 0 0 20px; color: rgba(255,255,255,.66); font-size: 11px; letter-spacing: .13em; text-transform: uppercase; }
        .framelo-hero__content h1 { margin: 0; font-size: clamp(54px, 8vw, 116px); font-weight: 500; line-height: .94; letter-spacing: -.065em; }
        .framelo-hero__content h1 span, h2 em { display: block; color: #c4b5fd; font-style: normal; }
        .framelo-hero__summary { max-width: 510px; margin: 24px auto 0; color: rgba(255,255,255,.84); font-size: 17px; line-height: 1.55; }
        .framelo-hero__ctas { display: flex; justify-content: center; gap: 9px; margin-top: 27px; }
        .framelo-hero__primary, .framelo-hero__secondary { min-height: 43px; padding: 0 19px; }
        .framelo-hero__secondary { display: inline-flex; align-items: center; gap: 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(0,0,0,.48); color: rgba(255,255,255,.86); text-decoration: none; font-size: 12px; backdrop-filter: blur(8px); }
        .framelo-hero__hint { position: absolute; bottom: 28px; left: 4vw; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.54); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .framelo-hero__hint span, .rail-hint span { display: block; width: 32px; height: 1px; background: currentColor; }
        .framelo-hero__burger, .framelo-hero__mobile-menu { display: none; }
        .landing-section { border-top: 1px solid #202026; padding: 120px 0; }
        .landing-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
        .section-heading { max-width: 620px; }
        .section-heading h2, .showcase-heading h2, .landing-cta h2 { margin: 0; font-size: clamp(40px, 5vw, 72px); font-weight: 500; line-height: .96; letter-spacing: -.06em; }
        .section-heading > p:last-child { max-width: 390px; margin: 28px 0 0; color: #92929d; font-size: 14px; line-height: 1.7; }
        .workflow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin: 70px 0 0; padding: 0; overflow: hidden; border: 1px solid #28282f; border-radius: 20px; background: #28282f; list-style: none; }
        .workflow-grid li { position: relative; min-height: 260px; padding: 27px; background: #101014; transition: background .3s, transform .3s; }
        .workflow-grid li:hover { background: #17171d; transform: translateY(-5px); }
        .step-number { color: #9c8cff; font-size: 11px; letter-spacing: .1em; }
        .workflow-grid h3, .feature-grid h3 { margin: 60px 0 10px; font-size: 15px; font-weight: 500; }
        .workflow-grid p, .feature-grid p { margin: 0; color: #858591; font-size: 12px; line-height: 1.65; }
        .step-arrow { position: absolute; right: 24px; top: 24px; color: #777783; font-size: 20px; }
        .features-section { background: #0b0b0e; }
        .section-heading--wide { display: flex; max-width: 100%; align-items: end; justify-content: space-between; gap: 40px; }
        .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 70px; border: 1px solid #28282f; border-radius: 20px; overflow: hidden; background: #28282f; }
        .feature-grid article { position: relative; min-height: 220px; padding: 26px; background: #101014; transition: background .3s; }
        .feature-grid article:hover { background: #17171d; }
        .feature-grid article > span { color: #696978; font-size: 11px; }
        .feature-grid article h3 { margin-top: 48px; }
        .feature-grid svg { position: absolute; right: 26px; top: 26px; width: 15px; color: #9c8cff; }
        .showcase-section { padding-bottom: 40px; }
        .showcase-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; }
        .showcase-heading > a { display: inline-flex; align-items: center; gap: 9px; color: #c4b5fd; font-size: 12px; text-decoration: none; }
        .showcase-rail { display: flex; gap: 18px; overflow-x: auto; margin-top: 70px; padding: 0 max(24px, calc((100vw - 1180px) / 2)) 20px; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: #3b3b46 transparent; cursor: grab; touch-action: pan-y; }
        .showcase-rail.is-dragging { cursor: grabbing; scroll-snap-type: none; }
        .showcase-card { flex: 0 0 min(430px, 78vw); scroll-snap-align: start; overflow: hidden; border: 1px solid #2a2a31; border-radius: 18px; background: #111116; opacity: 0; transform: translateY(34px) scale(.97); }
        .showcase-section.is-visible .showcase-card { animation: showcaseCardIn .8s cubic-bezier(.22,1,.36,1) forwards; }
        .showcase-section.is-visible .showcase-card:nth-child(2) { animation-delay: .1s; }
        .showcase-section.is-visible .showcase-card:nth-child(3) { animation-delay: .2s; }
        .showcase-section.is-visible .showcase-card:nth-child(4) { animation-delay: .3s; }
        .showcase-card__art { position: relative; display: flex; min-height: 350px; flex-direction: column; justify-content: end; overflow: hidden; padding: 28px; }
        .showcase-card__art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .78; transition: transform .7s cubic-bezier(.22,1,.36,1), opacity .3s ease; pointer-events: none; animation: templateFloat 7s ease-in-out infinite; }
        .showcase-card:hover .showcase-card__art img { opacity: .9; transform: scale(1.04); }
        .showcase-card__art::before { content: ""; position: absolute; inset: 12% 14%; border: 1px solid rgba(255,255,255,.18); border-radius: 38% 42% 20% 25%; transform: rotate(-12deg); opacity: .7; }
        .showcase-card__art::after { content: ""; position: absolute; width: 190px; height: 270px; right: 20%; top: 16%; border: 8px solid rgba(255,255,255,.7); border-radius: 26px; transform: rotate(13deg); box-shadow: 0 20px 60px rgba(0,0,0,.4); animation: deviceFloat 5s ease-in-out infinite; pointer-events: none; }
        .showcase-card--crimson .showcase-card__art { background: linear-gradient(140deg, #160c12, #852e3a); }
        .showcase-card--midnight .showcase-card__art { background: linear-gradient(140deg, #120e0c, #b35a26); }
        .showcase-card--amber .showcase-card__art { background: linear-gradient(140deg, #12100c, #8c5a1d); }
        .showcase-card--lime .showcase-card__art { background: linear-gradient(140deg, #0b120d, #8bab22); }
        .showcase-card__art span, .showcase-card__art strong { position: relative; z-index: 1; }
        .showcase-card__art span { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
        .showcase-card__art strong { margin-top: 8px; font-size: 44px; font-weight: 500; letter-spacing: -.06em; }
        .showcase-card__meta { padding: 22px 24px 26px; }
        .showcase-card__meta > span { color: #9c8cff; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .showcase-card__meta h3 { margin: 11px 0 7px; font-size: 18px; font-weight: 500; }
        .showcase-card__meta p { margin: 0; color: #858591; font-size: 12px; }
        @keyframes showcaseCardIn { from { opacity: 0; transform: translateY(34px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes templateFloat { 0%, 100% { transform: scale(1.01) translate3d(0, 0, 0); } 50% { transform: scale(1.045) translate3d(-1.2%, -1%, 0); } }
        @keyframes deviceFloat { 0%, 100% { transform: rotate(13deg) translateY(0); } 50% { transform: rotate(10deg) translateY(-8px); } }
        .rail-hint { width: min(1180px, calc(100% - 48px)); margin: 28px auto 0; display: flex; align-items: center; gap: 10px; color: #62626d; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .landing-cta { display: flex; width: min(1180px, calc(100% - 48px)); margin: 80px auto; align-items: end; justify-content: space-between; gap: 30px; padding: 50px; border: 1px solid #2a2a31; border-radius: 22px; background: radial-gradient(circle at 80% 20%, #27204e, #111116 50%); }
        .landing-cta > a { padding: 13px 18px; }
        .landing-footer { border-top: 1px solid #202026; padding: 46px max(24px, calc((100vw - 1180px) / 2)) 30px; }
        .landing-footer__top, .landing-footer__bottom { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .landing-footer__top p, .landing-footer__bottom, .landing-footer__bottom a { color: #696974; font-size: 11px; }
        .landing-footer__top > a { color: #c4b5fd; font-size: 12px; text-decoration: none; }
        .landing-footer__top > a, .landing-footer__bottom nav { display: flex; align-items: center; gap: 18px; }
        .landing-footer__bottom { margin-top: 65px; padding-top: 18px; border-top: 1px solid #202026; }
        .landing-footer__bottom nav a { text-decoration: none; }
        .landing-footer__bottom a:hover { color: #fff; }
        [data-reveal] { opacity: 0; transform: translateY(28px); transition: opacity .75s ease, transform .75s cubic-bezier(.22,1,.36,1); }
        [data-reveal].is-visible { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) { [data-reveal], .showcase-card { opacity: 1; transform: none; transition: none; animation: none !important; } .framelo-hero__video { transition: none; } }
        @media (max-width: 760px) {
          .framelo-hero__nav { height: 62px; padding: 0 20px; }
          .framelo-hero__links, .framelo-hero__actions { display: none; }
          .framelo-hero__burger { display: grid; place-items: center; width: 38px; height: 34px; margin-left: auto; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(0,0,0,.45); color: #fff; }
          .framelo-hero__burger svg { width: 16px; }
          .framelo-hero__mobile-menu { position: absolute; top: 58px; right: 16px; display: flex; width: min(290px, calc(100vw - 32px)); flex-direction: column; gap: 4px; padding: 9px; border: 1px solid rgba(255,255,255,.12); border-radius: 17px; background: rgba(8,8,10,.88); backdrop-filter: blur(22px); }
          .framelo-hero__mobile-menu a { padding: 12px; border-radius: 10px; color: rgba(255,255,255,.78); font-size: 14px; text-decoration: none; }
          .framelo-hero__mobile-cta { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 5px; background: #fff; color: #09090b !important; }
          .framelo-hero__content { transform: translate(-50%, -48%); }
          .framelo-hero__content h1 { font-size: clamp(54px, 15vw, 82px); }
          .framelo-hero__summary { font-size: 15px; }
          .framelo-hero__ctas { flex-wrap: wrap; }
          .landing-section { padding: 80px 0; }
          .section-heading--wide, .showcase-heading, .landing-cta, .landing-footer__top, .landing-footer__bottom { align-items: flex-start; flex-direction: column; }
          .workflow-grid, .feature-grid { grid-template-columns: 1fr; margin-top: 45px; }
          .workflow-grid li { min-height: 190px; }
          .workflow-grid h3, .feature-grid article h3 { margin-top: 35px; }
          .landing-cta { padding: 32px 24px; margin-top: 40px; }
          .landing-footer__bottom { margin-top: 45px; align-items: flex-start; }
        }
        @media (max-width: 390px) { .framelo-hero__ctas { flex-direction: column; align-items: stretch; } .framelo-hero__primary, .framelo-hero__secondary { justify-content: center; } }
      `}</style>
    </main>
  );
}
