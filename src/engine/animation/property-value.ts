import { resolveTextMetadata } from "@/engine/text/text-types";
import { isTransformProperty, type AnimatableProperty } from "@/types/animation";
import type { Layer, Transform } from "@/types/layer";

/**
 * Where a property's *un-animated* value lives.
 *
 * Most of a layer's animatable properties are transform fields. A text layer
 * adds four that are not — font size, letter spacing, line height and reveal —
 * and those are stored with the typography rather than in the matrix.
 *
 * Every place that asks "what is this property worth right now" goes through
 * here, so adding an animatable property to a layer type is one edit rather
 * than a hunt through the keyframe UI, the store and the preset generator.
 */
export function staticPropertyValue(layer: Layer, property: AnimatableProperty): number {
  if (isTransformProperty(property)) return layer.transform[property];
  return textPropertyValue(layer.metadata, property);
}

/** The same lookup against a transform and metadata held separately. */
export function staticPropertyValueOf(
  transform: Transform,
  metadata: unknown,
  property: AnimatableProperty,
): number {
  if (isTransformProperty(property)) return transform[property];
  return textPropertyValue(metadata, property);
}

function textPropertyValue(metadata: unknown, property: AnimatableProperty): number {
  const style = resolveTextMetadata(metadata);
  switch (property) {
    case "fontSize":
      return style.fontSize;
    case "letterSpacing":
      return style.letterSpacing;
    case "lineHeight":
      return style.lineHeight;
    case "reveal":
      // Fully revealed is the resting state: a text layer with no reveal
      // animation must show all of its words, not none of them.
      return 1;
    case "blur":
      return 0;
    default:
      return 0;
  }
}
