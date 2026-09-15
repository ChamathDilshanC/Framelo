"use client";

import { Images, LibraryBig, PanelLeftClose, Smartphone, Type } from "lucide-react";
import * as React from "react";

import { AssetLibrary } from "@/components/assets/AssetLibrary";
import { DeviceLibrary } from "@/components/devices/DeviceLibrary";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { TextToolPanel } from "@/components/text/TextToolPanel";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useEditorStore, type LeftPanelTab } from "@/store/editor-store";

const TABS: Array<{
  id: LeftPanelTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "text", label: "Text", icon: Type },
  { id: "assets", label: "Assets", icon: Images },
  // One rail entry for four catalogues. They were two before — Motion Presets
  // and Templates — and the two that were added would have made four icons for
  // four things nobody can tell apart from an icon.
  { id: "library", label: "Library", icon: LibraryBig },
];

export function LeftSidebar() {
  const tab = useEditorStore((state) => state.leftPanelTab);
  const open = useEditorStore((state) => state.leftPanelOpen);
  const setTab = useEditorStore((state) => state.setLeftPanelTab);
  const togglePanel = useEditorStore((state) => state.toggleLeftPanel);

  const active = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  return (
    <div className="flex h-full">
      {/* Icon rail: always visible, so the panel can collapse without losing navigation */}
      <nav
        aria-label="Editor tools"
        className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2"
      >
        {TABS.map((entry) => (
          <IconButton
            key={entry.id}
            icon={entry.icon}
            label={entry.label}
            active={open && entry.id === tab}
            tooltipSide="right"
            onClick={() => {
              if (open && entry.id === tab) togglePanel(false);
              else setTab(entry.id);
            }}
          />
        ))}
      </nav>

      <aside
        className={cn(
          "flex h-full flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200 ease-out-quint",
          open ? "w-64" : "w-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-line pr-1.5 pl-3">
          <h2 className="panel-label">{active.label}</h2>
          <IconButton
            icon={PanelLeftClose}
            label="Collapse panel"
            size="sm"
            onClick={() => togglePanel(false)}
            tooltipSide="right"
          />
        </div>

        <div
          className={cn(
            "min-h-0 flex-1",
            // The library owns its own scroll so the tab strip stays pinned;
            // everything else scrolls as one column.
            tab === "library" ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {tab === "devices" ? <DeviceLibrary /> : null}
          {tab === "text" ? <TextToolPanel /> : null}
          {tab === "assets" ? <AssetLibrary /> : null}
          {tab === "library" ? <LibraryBrowser /> : null}
        </div>
      </aside>
    </div>
  );
}
