# Viewport context loss — 2026-09-24

## Cause and fix

The white viewport was reproduced in local Chrome while orbiting a MacBook Pro M4. The console repeatedly reported `THREE.WebGLRenderer: Context Lost` followed by `Context Restored`.

`useWebGLAvailable` used an uncached `useSyncExternalStore` snapshot that created a canvas and WebGL context on every read. Editor updates repeatedly allocated contexts without releasing them, competing with the actual viewport. Availability now probes WebGL 2 once per browser module lifetime and explicitly releases the temporary context. WebGL 1 alone is no longer reported as sufficient for the installed Three.js renderer.

The editor also listens for actual context loss/restoration events. It suspends rendering and shows a recovery message while disconnected, then rebuilds the canvas and GPU resources on restoration. A Restore viewport button offers the same rebuild manually. Layer data, playhead and camera pose remain in the existing stores.

Studio environment generation now happens in a layout effect with matching cleanup, including disposal of the entire render target/framebuffer. Discarded Strict Mode renders no longer allocate orphaned environment targets.

Context release follows [MDN's WebGL resource guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#lose_contexts_eagerly).

## Verification

- Chrome: reproduced the white frame before the fix; repeated horizontal/vertical orbits and device changes rendered correctly afterward on MacBook Pro M4, iPhone 17 Pro and iPad. No new context-loss logs during the final interaction checks.
- Chrome: temporarily injected a development-only keyboard action calling `forceContextLoss`, followed by `forceContextRestore`. Verified recovery UI, automatic scene reconstruction and restored device rendering. Removed the injection before the final build.
- Tests cover repeated support checks, probe release, unsupported contexts, SSR, context event ordering/unsubscription, environment target cleanup and remounting.
- `npm test`: 670 tests passed across 32 files.
- `npm run typecheck`, `npm run lint`, `npm run build`: passed.

Changes are local; the deployed Vercel application has not been updated by this work.
