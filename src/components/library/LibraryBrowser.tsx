"use client";

import * as React from "react";

import { DeviceMotionBrowser } from "@/components/motion/DeviceMotionBrowser";
import { MotionPresetBrowser } from "@/components/motion/MotionPresetBrowser";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";
import { cn } from "@/lib/utils";
import { useEditorStore, type LibraryTab } from "@/store/editor-store";

/**
 * The four libraries, in one panel.
 *
 * They are genuinely different things and keeping them apart is the whole
 * architecture (§13), but *choosing* between them is one decision, so they
 * belong side by side:
 *
 * | Tab | What it changes | Reach |
 * |---|---|---|
 * | **Templates** | canvas, background, device, text, motion | the whole project |
 * | **Device Motion** | the device's pose and choreography | the device layer |
 * | **Motion Presets** | animation tracks | any layer, stackable |
 * | **Text Presets** | animation tracks on text | a text layer, stackable |
 *
 * That table is also the one-line description under each tab, because the
 * question someone actually has when they open this is "which of these will
 * wreck what I have already done".
 *
 * Only the visible tab is mounted. Four browsers alive at once would mean four
 * search boxes, four sets of filters and — worse — a preview left running in a
 * tab nobody can see.
 */

interface TabDefinition {
  id: LibraryTab;
  label: string;
  blurb: string;
}

const TABS: TabDefinition[] = [
  { id: "templates", label: "Templates", blurb: "A whole starting project." },
  { id: "device-motion", label: "Device Motion", blurb: "A finished device animation." },
  { id: "motion", label: "Motion Presets", blurb: "One effect, stackable." },
  { id: "text", label: "Text Presets", blurb: "Text animation, stackable." },
];

export function LibraryBrowser() {
  const tab = useEditorStore((state) => state.libraryTab);
  const setTab = useEditorStore((state) => state.setLibraryTab);

  const active = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Libraries"
        className="grid shrink-0 grid-cols-2 gap-px border-b border-line bg-line"
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === tab}
            onClick={() => setTab(entry.id)}
            className={cn(
              "px-2 py-1.5 text-[11px] transition-colors duration-150",
              entry.id === tab
                ? "bg-surface-active font-medium text-ink"
                : "bg-surface text-ink-subtle hover:bg-surface-hover hover:text-ink-muted",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <p className="shrink-0 border-b border-line px-3 py-1.5 text-[10px] text-ink-subtle">
        {active.blurb}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "templates" ? <TemplateLibrary /> : null}
        {tab === "device-motion" ? <DeviceMotionBrowser /> : null}
        {tab === "motion" ? <MotionPresetBrowser scope="device" /> : null}
        {tab === "text" ? <MotionPresetBrowser scope="text" /> : null}
      </div>
    </div>
  );
}
