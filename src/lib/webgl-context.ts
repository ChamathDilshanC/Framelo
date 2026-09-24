/** Context loss is a DOM event, not a React error boundary exception. */
export function watchWebGLContext(
  canvas: EventTarget,
  onLost: () => void,
  onRestored: () => void,
): () => void {
  let lost = false;
  const handleLost = (event: Event) => {
    // Opt into restoration even if the renderer's own listener changes.
    event.preventDefault();
    if (lost) return;
    lost = true;
    onLost();
  };
  const handleRestored = () => {
    if (!lost) return;
    lost = false;
    onRestored();
  };
  canvas.addEventListener("webglcontextlost", handleLost);
  canvas.addEventListener("webglcontextrestored", handleRestored);
  return () => {
    canvas.removeEventListener("webglcontextlost", handleLost);
    canvas.removeEventListener("webglcontextrestored", handleRestored);
  };
}
