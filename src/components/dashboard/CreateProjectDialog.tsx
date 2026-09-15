"use client";

import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PanelRow } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getAvailableDevices, DEFAULT_DEVICE_ID } from "@/devices/registry";
import { getMotionPreset, MOTION_PRESETS } from "@/engine/motion/motion-presets";
import { generateTracks, planDuration } from "@/engine/motion/preset-generator";
import { CANVAS_PRESETS, FPS_OPTIONS } from "@/lib/constants";
import { createProject } from "@/lib/project-factory";
import { saveProject } from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DEFAULT_BACKGROUND, DEFAULT_GRADIENT, type BackgroundConfig } from "@/types/background";

/**
 * The create-project flow.
 *
 * Every choice here is a starting point, not a commitment: the device,
 * background and template all remain editable afterwards. The dialog exists so
 * a new project opens as something worth looking at, rather than as an empty
 * grey stage the user has to assemble before they can judge anything.
 */

/**
 * Starting points offered at creation time.
 *
 * A curated handful, not the whole library: the create dialog is a decision
 * about what kind of thing you are making, and thirty options there would be a
 * worse version of the motion browser that lives in the editor.
 */
const STARTER_IDS = [
  "device-spin",
  "product-reveal",
  "cinematic-reveal",
  "rise-in",
  "floating-loop",
];

const STARTERS = [
  { id: "blank", name: "Blank", description: "A still device, no animation." },
  ...MOTION_PRESETS.filter((preset) => STARTER_IDS.includes(preset.id)).map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
  })),
];

const BACKGROUND_CHOICES: Array<{ id: string; label: string; value: BackgroundConfig }> = [
  { id: "dark", label: "Dark", value: DEFAULT_BACKGROUND },
  { id: "light", label: "Light", value: { type: "solid", value: "#faf8f3" } },
  { id: "gradient", label: "Gradient", value: DEFAULT_GRADIENT },
  { id: "none", label: "None", value: { type: "transparent" } },
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNames: string[];
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  existingNames,
}: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Create project"
        description="Pick a starting point. Everything stays editable."
        style={{ ["--dialog-width" as string]: "580px" }}
      >
        {/* Mounted per open, so every dialog starts from a clean form rather
            than inheriting the last attempt's half-finished state. */}
        {open ? <CreateProjectForm onOpenChange={onOpenChange} existingNames={existingNames} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectForm({
  onOpenChange,
  existingNames,
}: Omit<CreateProjectDialogProps, "open">) {
  const router = useRouter();
  const devices = getAvailableDevices();

  const [name, setName] = React.useState("");
  const [deviceId, setDeviceId] = React.useState(DEFAULT_DEVICE_ID);
  const [canvasId, setCanvasId] = React.useState<string>(CANVAS_PRESETS[0].id);
  const [fps, setFps] = React.useState(30);
  const [duration, setDuration] = React.useState(5);
  const [backgroundId, setBackgroundId] = React.useState("dark");
  const [starterId, setStarterId] = React.useState("device-spin");
  const [creating, setCreating] = React.useState(false);

  const canvas = CANVAS_PRESETS.find((entry) => entry.id === canvasId) ?? CANVAS_PRESETS[0];
  const background =
    BACKGROUND_CHOICES.find((entry) => entry.id === backgroundId)?.value ?? DEFAULT_BACKGROUND;

  async function handleCreate() {
    setCreating(true);

    try {
      const project = createProject({
        name: name.trim() || nextProjectName(existingNames),
        deviceId,
        background,
        canvas: { width: canvas.width, height: canvas.height, fps, duration },
      });

      // The starter motion is generated here, not in the editor, so the
      // project is already animated the first time it renders.
      const preset = getMotionPreset(starterId);
      if (preset) {
        const layer = project.layers[0];
        const plan = planDuration(preset, duration, "fit");
        layer.animations = generateTracks(preset, {
          baseTransform: layer.transform,
          duration: plan.presetSpan,
        });
      }

      await saveProject(project);
      notify.success("Project created", project.name);
      router.push(`/editor/${project.id}`);
    } catch (error) {
      setCreating(false);
      notify.error(
        "Could not create the project",
        error instanceof Error ? error.message : "Local storage is unavailable.",
      );
    }
  }

  return (
    <>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="panel-label block">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              autoFocus
              placeholder={nextProjectName(existingNames)}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !creating) void handleCreate();
              }}
              className="h-8 w-full rounded-sm border border-line bg-surface-raised px-2.5 text-[12px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="panel-label">Start from</span>
            <div className="grid grid-cols-3 gap-1.5">
              {STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  aria-pressed={starterId === starter.id}
                  title={starter.description}
                  onClick={() => setStarterId(starter.id)}
                  className={cn(
                    "rounded-sm border px-2 py-2 text-left transition-colors duration-150",
                    starterId === starter.id
                      ? "border-accent/60 bg-accent-soft"
                      : "border-line bg-surface-raised hover:border-line-strong",
                  )}
                >
                  <span className="block text-[11px] font-medium text-ink">{starter.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-subtle">
                    {starter.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="panel-label">Device</span>
            <div className="grid grid-cols-3 gap-1.5">
              {devices.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  aria-pressed={deviceId === device.id}
                  onClick={() => setDeviceId(device.id)}
                  className={cn(
                    "rounded-sm border px-2 py-2 text-left transition-colors duration-150",
                    deviceId === device.id
                      ? "border-accent/60 bg-accent-soft"
                      : "border-line bg-surface-raised hover:border-line-strong",
                  )}
                >
                  <span className="block truncate text-[11px] font-medium text-ink">
                    {device.name}
                  </span>
                  <span className="numeric mt-0.5 block text-[10px] text-ink-subtle">
                    {device.ratioLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <PanelRow label="Canvas">
            <Select
              aria-label="Canvas size"
              size="md"
              value={canvasId}
              onChange={setCanvasId}
              options={CANVAS_PRESETS.map((preset) => ({
                value: preset.id,
                label: preset.name,
                hint: preset.detail,
              }))}
            />
          </PanelRow>

          <div className="grid grid-cols-2 gap-3">
            <PanelRow label="FPS">
              <Select
                aria-label="Frames per second"
                size="md"
                value={String(fps)}
                onChange={(value) => setFps(Number(value))}
                options={FPS_OPTIONS.map((option) => ({
                  value: String(option),
                  label: `${option} fps`,
                }))}
              />
            </PanelRow>
            <PanelRow label="Duration">
              <Select
                aria-label="Duration"
                size="md"
                value={String(duration)}
                onChange={(value) => setDuration(Number(value))}
                options={[3, 5, 8, 12].map((option) => ({
                  value: String(option),
                  label: `${option} sec`,
                }))}
              />
            </PanelRow>
          </div>

          <div className="space-y-1.5">
            <span className="panel-label">Background</span>
            <div className="grid grid-cols-4 gap-1.5">
              {BACKGROUND_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={backgroundId === choice.id}
                  onClick={() => setBackgroundId(choice.id)}
                  className={cn(
                    "rounded-sm border px-2 py-1.5 text-[11px] transition-colors duration-150",
                    backgroundId === choice.id
                      ? "border-accent/60 bg-accent-soft text-ink"
                      : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-raised/40 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleCreate()} disabled={creating}>
            {creating ? <Spinner className="border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
            Create project
          </Button>
        </footer>
    </>
  );
}

/** The trigger, so the dashboard owns one piece of state instead of two. */
export function NewProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" size="sm" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" />
      New project
    </Button>
  );
}

export function nextProjectName(existing: string[]): string {
  const base = "Untitled project";
  if (!existing.includes(base)) return base;

  let index = 2;
  while (existing.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}
