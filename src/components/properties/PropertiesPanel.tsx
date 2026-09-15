"use client";

import { MousePointerSquareDashed } from "lucide-react";

import { LayerPanel } from "@/components/editor/LayerPanel";
import { AnimationPanel } from "@/components/properties/AnimationPanel";
import { BackgroundPanel } from "@/components/properties/BackgroundPanel";
import { DevicePanel } from "@/components/properties/DevicePanel";
import { ExportPanel } from "@/components/properties/ExportPanel";
import { ScreenPanel } from "@/components/properties/ScreenPanel";
import { TransformPanel } from "@/components/properties/TransformPanel";
import { TextProperties } from "@/components/text/TextProperties";
import { ViewPresetsPanel } from "@/components/properties/ViewPresetsPanel";
import { EmptyState } from "@/components/ui/panel";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

export function PropertiesPanel() {
  const layers = useProjectStore((state) => state.project?.layers);
  const fps = useProjectStore((state) => state.project?.canvas.fps ?? 30);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);

  const selectedLayer = layers?.find((layer) => layer.id === selectedLayerId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <LayerPanel layers={layers ?? []} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedLayer ? (
          <>
            {selectedLayer.type === "device" ? <ScreenPanel layer={selectedLayer} /> : null}
            {selectedLayer.type === "device" ? <ViewPresetsPanel layer={selectedLayer} /> : null}
            {/*
              Typography comes before the transform for text: the words and the
              typeface are what a user came to change, and the position is
              usually set by dragging on the canvas rather than typed here.
            */}
            {selectedLayer.type === "text" ? <TextProperties layer={selectedLayer} /> : null}
            <TransformPanel layer={selectedLayer} />
            {selectedLayer.type === "device" ? (
              <>
                <DevicePanel layer={selectedLayer} />
              </>
            ) : null}
            <AnimationPanel layer={selectedLayer} fps={fps} />
          </>
        ) : (
          <EmptyState
            icon={MousePointerSquareDashed}
            title="Nothing selected"
            description="Select a layer to edit its transform, appearance and animation."
          />
        )}
        <BackgroundPanel />
        {/* Last, and outside the selection branch: exporting is about the
            composition, not about whichever layer happens to be selected. */}
        <ExportPanel />
      </div>
    </div>
  );
}
