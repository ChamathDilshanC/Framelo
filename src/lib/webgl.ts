import * as React from "react";

let webglAvailable: boolean | undefined;

export function canCreateWebGL(): boolean {
  if (typeof document === "undefined") return true;
  if (webglAvailable !== undefined) return webglAvailable;

  // getSnapshot runs on every render/store consistency check. Creating a new
  // context each time exhausts the browser's context budget and evicts the
  // live viewport while orbiting. Probe once, then immediately release it.
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    webglAvailable = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglAvailable = false;
  }
  return webglAvailable;
}

const subscribe = () => () => undefined;
const serverSnapshot = () => true;

export function useWebGLAvailable(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    canCreateWebGL,
    serverSnapshot,
  );
}
