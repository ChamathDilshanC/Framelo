"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { PROJECT_TEMPLATES, type ProjectTemplate } from "@/engine/templates/project-templates";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import { getDevice } from "@/devices/registry";
import { notify } from "@/lib/toast";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

export function TemplateLibrary() {
  const project = useProjectStore((state) => state.project);
  const applyProjectTemplate = useProjectStore((state) => state.applyProjectTemplate);

  function apply(template: ProjectTemplate) {
    if (!project) return;
    const existing = project.layers.find((layer) => layer.type === "device") ?? null;
    const { layers, deviceLayerId } = buildTemplateLayers(template, existing);
    applyProjectTemplate(template, layers);
    const editor = useEditorStore.getState();
    editor.pause();
    editor.endTextEditing();
    editor.clearKeyframeSelection();
    editor.setDuration(template.canvas.duration);
    editor.setCurrentTime(template.posterTime ?? 0);
    editor.requestCameraReset();
    editor.setCameraView(template.cameraView ?? "front");
    editor.selectLayer(deviceLayerId);
    editor.toggleTimeline(true);
    notify.success(`${template.name} applied`, "Editable layers, screen artwork and cinematic keyframes. Press play to preview.");
  }

  return (
    <div className="min-w-0 space-y-4 p-3">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-ink-subtle">
        <span>Signature collection</span><span>{String(PROJECT_TEMPLATES.length).padStart(2, "0")}</span>
      </div>
      {PROJECT_TEMPLATES.map((template) => (
        <article key={template.id} className="min-w-0 overflow-hidden rounded-md border border-line bg-surface-raised">
          <TemplatePreview template={template} />
          <div className="space-y-3 p-3">
            <div>
              <p className="mb-2 text-[8px] font-medium uppercase tracking-[0.18em] text-[#f06445]">Editorial / Cinematic</p>
              <h3 className="text-[13px] font-medium leading-snug text-ink">{template.name}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-subtle">{template.description}</p>
            </div>
            <p className="text-[9px] leading-relaxed text-ink-subtle">{template.canvas.duration}s · {getDevice(template.deviceId).name} · {template.canvas.height > template.canvas.width ? "Portrait" : "Landscape"}</p>
            <Button size="xs" variant="secondary" className="w-full justify-between" disabled={!project} onClick={() => apply(template)}>
              Use template <ArrowUpRight className="size-3" />
            </Button>
          </div>
        </article>
      ))}
      <p className="text-[10px] leading-relaxed text-ink-subtle">A complete composition. Edit every layer, replace any screen, make it yours. Applying replaces the composition; your main screenshot is kept. Undo restores it.</p>
    </div>
  );
}
