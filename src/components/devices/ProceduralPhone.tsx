"use client";

import { RoundedBox } from "@react-three/drei";
import * as React from "react";

import { createRoundedRectGeometry } from "@/engine/scene/geometry";
import type { DeviceDefinition } from "@/types/device";

interface ProceduralPhoneProps {
  device: DeviceDefinition;
  bodyColor: string;
  /** Screen content, rendered by the caller so texture handling stays in one place. */
  children?: React.ReactNode;
}

/**
 * Procedural phone body built from Three primitives.
 *
 * This is the fallback renderer used when no GLB is configured for a device, so
 * the editor is fully usable without any binary assets. It is deliberately
 * generic — a flat-railed slab with a pill cutout — not a copy of any product.
 */
export const ProceduralPhone = React.memo(function ProceduralPhone({
  device,
  bodyColor,
  children,
}: ProceduralPhoneProps) {
  const { body, screen, features } = device;

  const railGeometry = React.useMemo(
    () => createRoundedRectGeometry(body.width, body.height, body.cornerRadius, 12),
    [body.width, body.height, body.cornerRadius],
  );

  React.useEffect(() => () => railGeometry.dispose(), [railGeometry]);

  const halfDepth = body.depth / 2;

  return (
    <group>
      {/* Body slab */}
      <RoundedBox
        args={[body.width, body.height, body.depth]}
        radius={body.cornerRadius}
        smoothness={6}
        bevelSegments={4}
        creaseAngle={0.5}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={0.92}
          roughness={0.32}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          envMapIntensity={1.1}
        />
      </RoundedBox>

      {/* Polished outer rail: a hair wider than the slab, catching highlights */}
      <RoundedBox
        args={[body.width + 0.012, body.height + 0.012, body.depth * 0.62]}
        radius={body.cornerRadius + 0.006}
        smoothness={6}
        bevelSegments={4}
        creaseAngle={0.5}
      >
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={1}
          roughness={0.14}
          envMapIntensity={1.6}
        />
      </RoundedBox>

      {/* Black glass bed the screen sits on — also the letterbox for "contain" */}
      <mesh position={[0, 0, halfDepth + 0.0015]} geometry={railGeometry} scale={0.985}>
        <meshPhysicalMaterial
          color="#050507"
          metalness={0.2}
          roughness={0.22}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Screen content supplied by DeviceScreen */}
      <group position={screen.position} rotation={screen.rotation}>
        {children}
      </group>

      {features?.dynamicIsland ? <DynamicIsland device={device} /> : null}
      {features?.homeIndicator ? <HomeIndicator device={device} /> : null}
      {features?.sideButtons ? <SideButtons device={device} bodyColor={bodyColor} /> : null}
      {features?.cameraBump ? <CameraBump device={device} bodyColor={bodyColor} /> : null}
    </group>
  );
});

function DynamicIsland({ device }: { device: DeviceDefinition }) {
  const { screen } = device;
  const width = screen.width * 0.3;
  const height = 0.088;

  return (
    <mesh
      position={[0, screen.height / 2 - 0.15, screen.position[2] + 0.006]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <capsuleGeometry args={[height / 2, Math.max(0.01, width - height), 4, 16]} />
      <meshPhysicalMaterial color="#020203" roughness={0.18} metalness={0.1} />
    </mesh>
  );
}

function HomeIndicator({ device }: { device: DeviceDefinition }) {
  const { screen } = device;
  return (
    <mesh position={[0, -screen.height / 2 + 0.06, screen.position[2] + 0.004]}>
      <boxGeometry args={[screen.width * 0.32, 0.014, 0.001]} />
      <meshBasicMaterial color="#f5f5f7" transparent opacity={0.55} toneMapped={false} />
    </mesh>
  );
}

function SideButtons({ device, bodyColor }: { device: DeviceDefinition; bodyColor: string }) {
  const { body } = device;
  const x = body.width / 2;
  const depth = body.depth * 0.55;

  return (
    <group>
      {/* Volume pair + action button on the left rail */}
      {[0.72, 0.44, 1.02].map((y, index) => (
        <mesh key={y} position={[-x - 0.004, y, 0]} castShadow>
          <boxGeometry args={[0.012, index === 2 ? 0.12 : 0.2, depth]} />
          <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.2} />
        </mesh>
      ))}
      {/* Power button on the right rail */}
      <mesh position={[x + 0.004, 0.6, 0]} castShadow>
        <boxGeometry args={[0.012, 0.34, depth]} />
        <meshPhysicalMaterial color={bodyColor} metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

function CameraBump({ device, bodyColor }: { device: DeviceDefinition; bodyColor: string }) {
  const { body } = device;
  const z = -body.depth / 2;
  const plateSize = body.width * 0.46;
  const x = -body.width / 2 + plateSize / 2 + 0.1;
  const y = body.height / 2 - plateSize / 2 - 0.1;

  const lensPositions: Array<[number, number]> = [
    [-plateSize * 0.2, plateSize * 0.2],
    [plateSize * 0.2, plateSize * 0.2],
    [-plateSize * 0.2, -plateSize * 0.2],
  ];

  return (
    <group position={[x, y, z]}>
      <RoundedBox args={[plateSize, plateSize, 0.05]} radius={0.07} smoothness={4} castShadow>
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={0.9}
          roughness={0.38}
          envMapIntensity={1.2}
        />
      </RoundedBox>
      {lensPositions.map(([lx, ly]) => (
        <group key={`${lx}:${ly}`} position={[lx, ly, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.088, 0.088, 0.035, 24]} />
            <meshPhysicalMaterial color="#15161a" metalness={1} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.019, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.004, 24]} />
            <meshPhysicalMaterial
              color="#05060a"
              metalness={0.4}
              roughness={0.05}
              clearcoat={1}
              envMapIntensity={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
