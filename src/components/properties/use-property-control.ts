"use client";

import * as React from "react";

import type { KeyframeToggleState } from "@/components/properties/KeyframeToggle";
import { evaluateTrack, findTrack, keyframeAtTime } from "@/engine/animation/evaluate";
import { staticPropertyValue } from "@/engine/animation/property-value";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { AnimatableProperty } from "@/types/animation";
import type { Layer } from "@/types/layer";

interface PropertyControl {
  /** Value at the playhead: animated tracks win over the static transform. */
  value: number;
  animated: boolean;
  toggleState: KeyframeToggleState;
  setValue: (value: number) => void;
  toggleKeyframe: () => void;
}

/**
 * Binds one animatable property to the stores.
 *
 * Editing writes to the keyframe under the playhead when the property is
 * animated, and to the static transform otherwise — the behaviour users expect
 * from a keyframe editor.
 */
export function usePropertyControl(
  layer: Layer,
  property: AnimatableProperty,
): PropertyControl {
  const currentTime = useEditorStore((state) => state.currentTime);
  const setTransformValue = useProjectStore((state) => state.setTransformValue);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const removeKeyframe = useProjectStore((state) => state.removeKeyframe);

  const track = findTrack(layer.animations, property);
  const animated = Boolean(track && track.keyframes.length > 0);
  const keyed = animated ? keyframeAtTime(track, currentTime) : undefined;

  const value = React.useMemo(() => {
    const fallback = staticPropertyValue(layer, property);
    if (!track) return fallback;
    return evaluateTrack(track, currentTime) ?? fallback;
  }, [track, currentTime, layer, property]);

  const setValue = React.useCallback(
    (next: number) => {
      setTransformValue(layer.id, property, next, { time: currentTime });
    },
    [setTransformValue, layer.id, property, currentTime],
  );

  const toggleKeyframe = React.useCallback(() => {
    if (keyed) {
      removeKeyframe(layer.id, property, keyed.id);
      return;
    }
    addKeyframe(layer.id, property, currentTime);
  }, [keyed, removeKeyframe, addKeyframe, layer.id, property, currentTime]);

  const toggleState: KeyframeToggleState = keyed ? "keyed" : animated ? "animated" : "none";

  return { value, animated, toggleState, setValue, toggleKeyframe };
}
