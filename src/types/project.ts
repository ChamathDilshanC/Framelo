import type { BackgroundConfig } from "./background";
import type { Layer } from "./layer";

/**
 * 4: projects include the saved playhead, camera pose and selection.
 * 3: work area, template identity and export settings.
 */
export const PROJECT_VERSION = 4;

/** Static viewport and playhead, separate from animated layer transforms. */
export interface ProjectEditorState {
  currentTime: number;
  cameraView: import('@/engine/devices/device-presets').CameraViewId;
  camera: { position: [number, number, number]; target: [number, number, number] };
  selectedLayerId: string | null;
}

/**
 * The in/out range, as After Effects and Premiere mean it.
 *
 * Deliberately *not* the same thing as the duration. The duration is how long
 * the composition is; the work area is the slice of it you are currently
 * working on and, when you choose, the slice you export. Conflating the two
 * would mean every time someone wanted to preview a section they would have to
 * shorten the composition and throw away the keyframes past the new end.
 *
 * `enabled` exists so the range survives being switched off. Someone who sets
 * an in/out, exports the whole composition once and switches it back on should
 * find the range they set, not a range reset to the full length.
 */
export interface WorkArea {
  /** Seconds from the start of the composition. */
  in: number;
  out: number;
  enabled: boolean;
}

export interface CanvasConfig {
  width: number;
  height: number;
  fps: number;
  /** Composition length in seconds. */
  duration: number;
  workArea?: WorkArea;
}

/**
 * Export choices, remembered per project.
 *
 * A project exported at 4K WebP is almost always exported at 4K WebP again.
 * These are stored with the project rather than as an app preference because
 * the right resolution is a property of the piece, not of the person.
 */
export interface ExportSettings {
  format: string;
  resolutionId: string;
  transparent: boolean;
  /** "composition" renders the full duration; "work-area" renders in→out. */
  range: "composition" | "work-area";
}

export interface Project {
  version: number;
  id: string;
  name: string;
  /** URL-safe name. Public links use this instead of the raw id. */
  slug: string;
  description?: string;
  canvas: CanvasConfig;
  background: BackgroundConfig;
  layers: Layer[];
  /**
   * The template or device-motion template this composition was last built
   * from. Informational — the layers are the truth — but it lets the library
   * show what is currently applied instead of making the user remember.
   */
  templateId?: string;
  deviceMotionTemplateId?: string;
  exportSettings?: ExportSettings;
  editorState?: ProjectEditorState;
  createdAt: string;
  updatedAt: string;
}

/** The whole composition, for a project with no explicit range set. */
export function resolveWorkArea(canvas: CanvasConfig): WorkArea {
  const area = canvas.workArea;
  if (!area || !area.enabled) return { in: 0, out: canvas.duration, enabled: false };

  const start = Math.max(0, Math.min(area.in, canvas.duration));
  const end = Math.max(start, Math.min(area.out, canvas.duration));
  return { in: start, out: end, enabled: true };
}

/**
 * What a project looks like in a list.
 *
 * Deliberately excludes `layers` and `background`: the dashboard renders names
 * and thumbnails, and pulling a full project's keyframes to do that would move
 * megabytes to draw a grid.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  updatedAt: string;
  createdAt: string;
  /** Storage path or object URL for the poster image. */
  thumbnailUrl?: string | null;
  isPublic?: boolean;
  isPortfolio?: boolean;
  /** Where this project currently lives. */
  origin: "local" | "cloud";
}
