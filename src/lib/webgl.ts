import * as React from "react";

export function canCreateWebGL(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useWebGLAvailable(): boolean {
  return React.useSyncExternalStore(
    () => () => undefined,
    canCreateWebGL,
    () => true,
  );
}
