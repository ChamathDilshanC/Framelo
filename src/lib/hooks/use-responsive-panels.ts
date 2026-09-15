"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";

const COMPACT_WIDTH = 1180;
const NARROW_WIDTH = 960;

/**
 * Desktop stays the priority: panels only auto-collapse when the viewport gets
 * too narrow to keep the canvas usable, and reopen when there is room again.
 */
export function useResponsivePanels(): void {
  React.useEffect(() => {
    let lastMode: "wide" | "compact" | "narrow" | null = null;

    function apply() {
      const width = window.innerWidth;
      const mode = width < NARROW_WIDTH ? "narrow" : width < COMPACT_WIDTH ? "compact" : "wide";
      if (mode === lastMode) return;
      lastMode = mode;

      const store = useEditorStore.getState();
      store.toggleLeftPanel(mode === "wide");
      store.toggleRightPanel(mode !== "narrow");
    }

    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
}
