"use client";

import { GooeyToaster } from "goey-toast";
import * as React from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";

/**
 * Read the session once, for every route.
 *
 * This used to happen inside the dashboard's account menu, which meant it
 * never ran in the editor — and `cloud()` resolves the session from this
 * store, so an editor session had no user and quietly saved to this device
 * only. An hour of work while signed in never reached the account.
 *
 * It belongs at the root because auth is not a dashboard concern: saving,
 * sharing and publishing all ask who is signed in, from wherever they run.
 */
function AuthBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  return null;
}

/**
 * goey-toast is the single notification system for the whole application —
 * success, error, warning, info, upload, save and export messages all go
 * through `notify` in `@/lib/toast`.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <TooltipProvider delayDuration={320} skipDelayDuration={200}>
      <AuthBootstrap />
      {children}

      <GooeyToaster
        position="bottom-right"
        theme={theme}
        preset="smooth"
        gap={10}
        offset={20}
        visibleToasts={4}
        closeButton
        swipeToDismiss
      />
    </TooltipProvider>
  );
}
