"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

export function RightSidebar() {
  const open = useEditorStore((state) => state.rightPanelOpen);
  const togglePanel = useEditorStore((state) => state.toggleRightPanel);

  return (
    <div className="flex h-full">
      <aside
        className={cn(
          "flex h-full flex-col overflow-hidden border-l border-line bg-surface transition-[width] duration-200 ease-out-quint",
          open ? "w-[300px]" : "w-0",
        )}
        aria-hidden={!open}
        aria-label="Properties"
      >
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-line pr-1.5 pl-3">
          <h2 className="panel-label">Properties</h2>
          <IconButton
            icon={PanelRightClose}
            label="Collapse properties"
            size="sm"
            onClick={() => togglePanel(false)}
            tooltipSide="left"
          />
        </div>
        <div className="min-h-0 flex-1">
          <PropertiesPanel />
        </div>
      </aside>

      {!open ? (
        <div className="flex w-11 shrink-0 flex-col items-center border-l border-line bg-surface py-2">
          <IconButton
            icon={PanelRightOpen}
            label="Show properties"
            onClick={() => togglePanel(true)}
            tooltipSide="left"
          />
        </div>
      ) : null}
    </div>
  );
}
