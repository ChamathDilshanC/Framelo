"use client";

import * as React from "react";
import * as THREE from "three";
import { AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import { sceneRegistry } from "@/engine/scene/capture";
import { presetPreview } from "@/engine/motion/preset-preview";
import { screenAlignmentDelta, type ScreenAlignment } from "@/engine/text/screen-alignment";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { notify } from "@/lib/toast";
import type { Layer } from "@/types/layer";

const OPTIONS = [
  { value: "left", label: "Left", icon: AlignHorizontalJustifyStart },
  { value: "center", label: "Center", icon: AlignHorizontalJustifyCenter },
  { value: "right", label: "Right", icon: AlignHorizontalJustifyEnd },
  { value: "top", label: "Top", icon: AlignVerticalJustifyStart },
  { value: "middle", label: "Middle", icon: AlignVerticalJustifyCenter },
  { value: "bottom", label: "Bottom", icon: AlignVerticalJustifyEnd },
] as const;

export function ScreenAlignmentSection({ layer }: { layer: Layer }) {
  const [margin, setMargin] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const exporting = useEditorStore(state => state.isExporting);

  async function align(alignment: ScreenAlignment) {
    setBusy(true);
    const editor = useEditorStore.getState();
    editor.pause();
    editor.endTextEditing();
    presetPreview.stop();
    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const project = useProjectStore.getState().project;
      const current = project?.layers.find(item => item.id === layer.id);
      const handle = sceneRegistry.get();
      const root = handle?.scene.getObjectByName(`framelo-text-${layer.id}`);
      const mesh = root?.children.find(child => (child as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
      if (!project || !handle || !mesh || !current || current.locked) throw new Error("The text box is not ready to align.");
      mesh.updateWorldMatrix(true, false);
      const position = mesh.geometry.getAttribute("position");
      const corners = Array.from({ length: position.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld));
      const delta = screenAlignmentDelta(handle.camera, corners, project.canvas, alignment, margin);
      useProjectStore.getState().translateLayer(layer.id, delta);
    } catch (error) {
      notify.error("Could not align text", error instanceof Error ? error.message : "Try again once the text loads.");
    } finally { setBusy(false); }
  }

  return <PanelSection title="Screen alignment">
    <div className="grid grid-cols-3 gap-1.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => <Button key={value} size="xs" disabled={layer.locked || busy || exporting} aria-label={`Align text box to screen ${label.toLowerCase()}`} onClick={() => void align(value)}>
        <Icon className="h-3 w-3 shrink-0" />{label}
      </Button>)}
    </div>
    <PanelRow label="Edge margin">
      <NumericField label="px" value={margin} onChange={setMargin} min={0} max={2000} step={8} decimals={0} className="w-[90px]" />
    </PanelRow>
    <p className="text-[10px] leading-relaxed text-ink-subtle">Positions the text box in the canvas at the playhead. Animated text moves with its entire motion path.</p>
  </PanelSection>;
}
