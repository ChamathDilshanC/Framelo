"use client";

import * as React from "react";

import { getDevice, DEVICES } from "@/devices/registry";
import { evaluateTransform } from "@/engine/animation/evaluate";
import { logDeviceModel } from "@/engine/devices/mesh-inspector";
import { sceneRegistry } from "@/engine/scene/capture";
import { textCacheStats } from "@/engine/text/text-renderer";
import { useAssetStore } from "@/store/asset-store";
import { useAuthStore } from "@/store/auth-store";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { DeviceLayerMetadata } from "@/types/layer";

/**
 * Development-only inspection hook for end-to-end tests and manual debugging.
 * Compiled out of production builds.
 */
export function useDebugBridge(): void {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const bridge = {
      project: () => useProjectStore.getState().project,
      time: () => useEditorStore.getState().currentTime,
      setTime: (time: number) => useEditorStore.getState().setCurrentTime(time),
      play: () => useEditorStore.getState().play(),
      pause: () => useEditorStore.getState().pause(),
      canUndo: () => useProjectStore.getState().past.length > 0,
      saveStatus: () => useProjectStore.getState().saveStatus,
      evaluate: (time: number) => {
        const layer = useProjectStore.getState().project?.layers[0];
        return layer ? evaluateTransform(layer, time) : null;
      },

      /**
       * Session state as the editor sees it.
       *
       * Worth exposing because "the editor thinks nobody is signed in" is
       * invisible from the UI and silently turns cloud saves into local ones.
       */
      auth: () => {
        const state = useAuthStore.getState();
        return { status: state.status, available: state.available, userId: state.user?.id ?? null };
      },

      // --- Text ------------------------------------------------------------
      /** Texture cache occupancy — the number to watch when text feels heavy. */
      textCache: () => textCacheStats(),

      /**
       * The project store itself.
       *
       * Exposed so a performance run can build a fifty-layer composition
       * through the real actions rather than by mutating state behind them.
       */
      store: () => useProjectStore.getState(),

      // --- Devices ---------------------------------------------------------
      devices: () => DEVICES.map((device) => ({ id: device.id, model: device.model?.path })),

      /**
       * Print a GLB's scene graph — mesh names, material names and UV ranges.
       * This is how `screenMeshNames` / `screenMaterialNames` get filled in when
       * adding a device.
       */
      inspectDevice: (deviceId: string) => logDeviceModel(getDevice(deviceId)),

      /** Swap the device on the first device layer. */
      setDevice: (deviceId: string) => {
        const state = useProjectStore.getState();
        const layer = state.project?.layers.find((entry) => entry.type === "device");
        if (!layer) return false;
        state.updateDeviceMetadata(layer.id, { deviceId });
        return true;
      },

      /** Put an uploaded asset on the device screen. */
      setScreenAsset: (assetId: string | null) => {
        const state = useProjectStore.getState();
        const layer = state.project?.layers.find((entry) => entry.type === "device");
        if (!layer) return false;
        state.updateDeviceMetadata(layer.id, { screenAssetId: assetId });
        return true;
      },

      assets: () => useAssetStore.getState().assets.map(({ id, originalName }) => ({ id, originalName })),

      /**
       * Render state of every device material.
       *
       * Transparency bugs are almost always a depth/blend flag being wrong on
       * one material out of ninety, and that is invisible from the outside.
       */
      materials: () => {
        const handle = sceneRegistry.get();
        if (!handle) return null;

        const rows: Array<Record<string, unknown>> = [];
        handle.scene.traverse((object) => {
          const mesh = object as unknown as {
            isMesh?: boolean;
            visible: boolean;
            name?: string;
            renderOrder: number;
            material?: unknown;
            geometry?: { boundingBox?: unknown; computeBoundingBox?: () => void };
          };
          if (!mesh.isMesh || !mesh.visible) return;

          // Rough surface size, so a dump can be sorted by what the viewer
          // actually sees rather than by traversal order.
          let span: number | null = null;
          const geometry = mesh.geometry;
          if (geometry) {
            if (!geometry.boundingBox) geometry.computeBoundingBox?.();
            const box = geometry.boundingBox as
              | { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
              | null
              | undefined;
            if (box) {
              const dims = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z].sort(
                (a, b) => b - a,
              );
              span = Number((dims[0] * dims[1]).toFixed(4));
            }
          }

          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const entry of list) {
            const material = entry as unknown as Record<string, unknown> | null;
            if (!material) continue;
            const color = material.color as { getHexString?: () => string } | undefined;
            const emissive = material.emissive as { getHexString?: () => string } | undefined;
            rows.push({
              mesh: mesh.name,
              area: span,
              name: material.name,
              type: material.type,
              emissive: emissive?.getHexString ? `#${emissive.getHexString()}` : null,
              emissiveIntensity: material.emissiveIntensity,
              map: material.map ? "yes" : null,
              color: color?.getHexString ? `#${color.getHexString()}` : null,
              roughness: material.roughness,
              metalness: material.metalness,
              transparent: material.transparent,
              opacity: material.opacity,
              depthTest: material.depthTest,
              depthWrite: material.depthWrite,
              depthFunc: material.depthFunc,
              colorWrite: material.colorWrite,
              transmission: material.transmission,
              side: material.side,
              renderOrder: mesh.renderOrder,
            });
          }
        });
        return rows;
      },

      /** Live GPU resource counts — the quickest way to spot a leak. */
      renderInfo: () => {
        const handle = sceneRegistry.get();
        if (!handle) return null;
        const { memory, render, programs } = handle.gl.info;
        return {
          geometries: memory.geometries,
          textures: memory.textures,
          programs: programs?.length ?? 0,
          calls: render.calls,
          triangles: render.triangles,
        };
      },

      /** Force the procedural device on, to check the fallback path by hand. */
      useFallback: (enabled: boolean) => {
        const state = useProjectStore.getState();
        const layer = state.project?.layers.find((entry) => entry.type === "device");
        if (!layer) return false;
        state.updateDeviceMetadata(layer.id, {
          forceFallback: enabled,
        } as Partial<DeviceLayerMetadata>);
        return true;
      },
    };

    (window as unknown as Record<string, unknown>).__framelo = bridge;
    return () => {
      delete (window as unknown as Record<string, unknown>).__framelo;
    };
  }, []);
}
