import { getCameraView, type CameraViewId } from '@/engine/devices/device-presets';
import { PROJECT_TEMPLATES } from '@/engine/templates/project-templates';
import type { Project, ProjectEditorState } from '@/types/project';

export function cameraPoseFor(view: CameraViewId): ProjectEditorState['camera'] {
  const preset = getCameraView(view);
  return { position: [...(preset.position ?? [0, 0.1, 7.6])], target: [...preset.target] };
}

/** Older animated templates reopen at their composed poster, not the invisible entrance. */
export function resolveProjectView(project: Project): ProjectEditorState {
  const template = PROJECT_TEMPLATES.find(item => item.id === project.templateId);
  const saved = project.editorState;
  return {
    currentTime: Math.max(0, Math.min(project.canvas.duration, saved?.currentTime ?? template?.posterTime ?? 0)),
    cameraView: saved?.cameraView ?? template?.cameraView ?? 'front',
    camera: saved?.camera ?? cameraPoseFor(template?.cameraView ?? 'front'),
    selectedLayerId: project.layers.some(layer => layer.id === saved?.selectedLayerId)
      ? saved!.selectedLayerId : project.layers.find(layer => layer.type === 'device')?.id ?? project.layers[0]?.id ?? null,
  };
}
