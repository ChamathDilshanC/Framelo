"use client";

import { useThree } from "@react-three/fiber";
import * as React from "react";
import { watchWebGLContext } from "@/lib/webgl-context";

export function ContextRecovery({ onLost, onRestored }: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const gl = useThree((state) => state.gl);
  React.useEffect(
    () => watchWebGLContext(gl.domElement, onLost, onRestored),
    [gl, onLost, onRestored],
  );
  return null;
}
