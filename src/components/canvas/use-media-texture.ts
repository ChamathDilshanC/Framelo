"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { useScreenTexture, type ScreenTextureState } from "@/components/canvas/use-screen-texture";
import { registerScreenVideo, videoTimeAt } from "@/engine/scene/screen-videos";
import { useEditorStore } from "@/store/editor-store";
import type { AssetType } from "@/types/asset";

interface MediaOptions {
  flipY: boolean;
  getTime?: () => number;
  getPlaying?: () => boolean;
  loop?: boolean;
  muted?: boolean;
}

/** An image or VideoTexture, owned by one layer and released on replacement. */
export function useMediaTexture(url: string | null, type: AssetType, options: MediaOptions): ScreenTextureState {
  const image = useScreenTexture(type === "image" ? url : null, { flipY: options.flipY });
  const video = useVideoTexture(type === "video" ? url : null, options);
  return type === "video" ? video : image;
}

function useVideoTexture(url: string | null, options: MediaOptions): ScreenTextureState {
  const [state, setState] = React.useState<ScreenTextureState & { url: string | null }>({ url: null, texture: null, aspect: undefined, status: "idle", error: null });
  const element = React.useRef<HTMLVideoElement | null>(null);
  const textureRef = React.useRef<THREE.VideoTexture | null>(null);
  const flipY = options.flipY;
  const loop = options.loop ?? true;
  const muted = options.muted ?? true;

  React.useEffect(() => {
    if (!url) return;
    const video = document.createElement("video");
    video.muted = muted;
    video.loop = loop;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    element.current = video;
    const texture = new THREE.VideoTexture(video);
    texture.flipY = flipY;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    textureRef.current = texture;
    const unregister = registerScreenVideo(video);
    video.onloadedmetadata = () => {
      setState({ url, texture, aspect: video.videoWidth / video.videoHeight, status: "ready", error: null });
      const time = options.getTime ? options.getTime() : useEditorStore.getState().currentTime;
      video.currentTime = videoTimeAt(time, video.duration, loop);
    };
    video.onseeked = () => {
      texture.needsUpdate = true;
      // A timeline scrub may arrive during an earlier seek. Honour the newest
      // playhead after that seek finishes instead of leaving the old frame up.
      const time = options.getTime ? options.getTime() : useEditorStore.getState().currentTime;
      const target = videoTimeAt(time, video.duration, video.loop);
      if (Math.abs(video.currentTime - target) > 0.03) video.currentTime = target;
    };
    video.onerror = () => setState({ url, texture: null, aspect: undefined, status: "error", error: "The video could not be decoded" });
    video.src = url;
    video.load();
    return () => {
      unregister();
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (element.current === video) element.current = null;
      if (textureRef.current === texture) textureRef.current = null;
      queueMicrotask(() => texture.dispose());
    };
    // Changes to the media URL alone create a new video; settings update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, flipY]);

  React.useEffect(() => {
    if (!element.current) return;
    element.current.loop = loop;
    element.current.muted = muted;
  }, [loop, muted]);

  React.useEffect(() => {
    if (options.getTime) return;
    return useEditorStore.subscribe((editor) => {
      const video = element.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      const target = videoTimeAt(editor.currentTime, video.duration, loop);
      if (!editor.isPlaying) {
        video.pause();
        if (!video.seeking && Math.abs(video.currentTime - target) > 0.03) video.currentTime = target;
      } else if (!video.seeking && Math.abs(video.currentTime - target) > 0.2) {
        video.currentTime = target;
      }
    });
  }, [options.getTime, loop]);

  useFrame(() => {
    const video = element.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    const time = options.getTime ? options.getTime() : useEditorStore.getState().currentTime;
    const playing = options.getPlaying ? options.getPlaying() : useEditorStore.getState().isPlaying;
    const target = videoTimeAt(time, video.duration, loop);
    if (playing) {
      if (video.paused) {
        if (Math.abs(video.currentTime - target) > 0.12) video.currentTime = target;
        void video.play().catch(() => {});
      } else if (!video.seeking && Math.abs(video.currentTime - target) > 0.2) {
        video.currentTime = target;
      }
    } else {
      if (!video.paused) video.pause();
      if (!video.seeking && Math.abs(video.currentTime - target) > 0.03) {
        video.currentTime = target;
      }
    }
  });

  return state.url === url ? state : { texture: null, aspect: undefined, status: url ? "loading" : "idle", error: null };
}
