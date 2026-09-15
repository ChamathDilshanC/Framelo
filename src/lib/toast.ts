"use client";

import { gooeyToast } from "goey-toast";

/**
 * Thin wrapper over goey-toast so every notification in the app shares the same
 * tone, timing and copy conventions. Always use these helpers, never a second
 * notification system.
 */
const baseOptions = {
  preset: "smooth",
  showProgress: true,
} as const;

export const notify = {
  success(title: string, description?: string) {
    return gooeyToast.success(title, { ...baseOptions, description, duration: 3200 });
  },
  error(title: string, description?: string) {
    return gooeyToast.error(title, { ...baseOptions, description, duration: 5200 });
  },
  warning(title: string, description?: string) {
    return gooeyToast.warning(title, { ...baseOptions, description, duration: 4600 });
  },
  info(title: string, description?: string) {
    return gooeyToast.info(title, { ...baseOptions, description, duration: 3600 });
  },
  loading(title: string, description?: string) {
    return gooeyToast(title, { ...baseOptions, description, duration: 60_000 });
  },
  update(id: string | number, options: Parameters<typeof gooeyToast.update>[1]) {
    gooeyToast.update(id, options);
  },
  dismiss(id?: string | number) {
    gooeyToast.dismiss(id);
  },
};
