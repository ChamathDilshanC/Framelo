"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as React from "react";
import type * as THREE from "three";

import { DeviceScreen } from "@/components/devices/DeviceScreen";
import { ProceduralPhone } from "@/components/devices/ProceduralPhone";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { IPHONE } from "@/devices/iphone/config";

/**
 * Live product preview for the landing page — the same renderer the editor
 * uses, so the marketing shot is literally the product.
 */
export function HeroPreview() {
  return (
    <ErrorBoundary fallback={<StaticFallback />}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 8], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 6]} intensity={2} />
        <directionalLight position={[-6, 2, 3]} intensity={0.7} color="#c9d4ff" />

        <Environment resolution={256} frames={1}>
          <Lightformer
            form="rect"
            intensity={3.2}
            position={[0, 4, 3]}
            rotation={[-Math.PI / 2.2, 0, 0]}
            scale={[10, 6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[-5, 1, 2]}
            rotation={[0, Math.PI / 2.4, 0]}
            scale={[8, 8, 1]}
            color="#b9c6ff"
          />
          <Lightformer
            form="circle"
            intensity={2}
            position={[0, -3, 4]}
            scale={[5, 5, 1]}
            color="#7c6cff"
          />
        </Environment>

        <FloatingDevice />

        <ContactShadows
          position={[0, -1.9, 0]}
          opacity={0.5}
          scale={12}
          blur={2.8}
          far={5}
          resolution={512}
          color="#000000"
        />
      </Canvas>
    </ErrorBoundary>
  );
}

function FloatingDevice() {
  const ref = React.useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = ref.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.rotation.y = -0.32 + Math.sin(t * 0.32) * 0.28;
    group.rotation.x = 0.06 + Math.sin(t * 0.24) * 0.05;
    group.position.y = Math.sin(t * 0.55) * 0.11;
  });

  return (
    <group ref={ref} scale={1.02}>
      <ProceduralPhone device={IPHONE} bodyColor="#1c1d21">
        {/* No media: the generated placeholder screen stands in. */}
        <DeviceScreen device={IPHONE} mediaUrl={null} fit="cover" brightness={1.05} />
      </ProceduralPhone>
    </group>
  );
}

function StaticFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-[70%] w-[min(34%,220px)] rounded-[28px] border border-line-strong bg-surface-raised shadow-2xl shadow-black/60" />
    </div>
  );
}
