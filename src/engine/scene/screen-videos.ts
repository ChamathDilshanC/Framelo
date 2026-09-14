/** Video elements are per screen, while the editor timeline owns their clock. */
const activeVideos = new Set<HTMLVideoElement>();

export function registerScreenVideo(video: HTMLVideoElement): () => void {
  activeVideos.add(video);
  return () => activeVideos.delete(video);
}

export function videoTimeAt(projectTime: number, duration: number, loop: boolean): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return loop ? ((projectTime % duration) + duration) % duration : Math.min(Math.max(0, projectTime), Math.max(0, duration - 0.001));
}

/** Pause and seek before a still render so its video pixels match the playhead. */
export async function prepareScreenVideosForCapture(projectTime: number): Promise<void> {
  await Promise.all([...activeVideos].map(async (video) => {
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    video.pause();
    const target = videoTimeAt(projectTime, video.duration, video.loop);
    if (Math.abs(video.currentTime - target) < 0.03 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 2500);
      video.addEventListener("seeked", () => { clearTimeout(timeout); resolve(); }, { once: true });
      video.currentTime = target;
    });
  }));
}
