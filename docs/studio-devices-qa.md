# Studio devices and readiness

- `ipad` is original, stylized Framelo geometry. Regenerate with `node scripts/generate-studio-devices.mjs`; this also retains the legacy studio laptop asset.
- `macbook` now uses `public/devices/macbook-pro-2020.glb`, imported from the supplied Macbook-Pro-2020 folder. Regenerate with `node scripts/import-macbook-pro-2020.mjs "C:/path/to/Macbook-Pro-2020"`. The importer preserves all nine OBJ parts, restores keyboard and Touch Bar textures, adds masked logos and a separate editable 16:10 screen, and embeds all textures in the GLB.
- `iphone-13-pro` uses the editable procedural phone renderer with a notch. The duplicate `macbook-pro-m4` library entry is removed; saved scenes using that ID resolve to the imported MacBook.
- Both use a dedicated `Screen` mesh / `Display` material, top-left UVs, existing screen fit/filter uniforms, and the standard layer transform and animation path.
- Templates use the existing live 3D preview cards. `TemplateDeviceSpec.deviceId` is optional so older phone-only templates retain their existing behavior.
- A model is hidden until its screen has decoded, its finish is applied and shaders have compiled. The parent frame loop applies its animated transform before the 240 ms reveal. Downloads no longer show a temporary phone that swaps to a different model.
- Hover/focus prefetch uses the shared model cache. Two unused models are retained. Export waits for media/GPU preparation and the reveal as well as downloads. Video readiness requires a decoded frame, not just metadata.

## Automated verification

Typecheck, ESLint, the production build, and 593 tests passed. Added coverage parses the actual GLBs, checks display UV orientation, checks screen-fit uniforms and independent materials, and exercises each new template through media replacement, serialization, and undo/redo. A readiness test verifies export remains pending until all preparations finish.

Production HTTP checks returned 200 for the dashboard, both GLBs and both new screen artwork assets.

## Manual verification still needed

Windows Computer Use was attempted, but automatic policy review stopped it because the current browser URL could not be determined reliably. No further UI actions were attempted after that rejection. Visual quality, actual upload decoding and perceived performance remain unverified in a browser.

1. In a production server, select iPad and MacBook; test front, back and orbit views.
2. Upload JPG to iPad and PNG to MacBook. Exercise Cover, Contain and Stretch. Replace one with MP4 and then WebM; scrub and play.
3. Apply Editorial iPad Showcase, MacBook Product Presentation and Connected Device Ecosystem. Check composition at 3 seconds and entrances from 0 seconds. Replace all three ecosystem screens independently.
4. Throttle the network and switch devices repeatedly, including while a download is pending. Check that no fallback, back-facing flash or untextured screen appears during normal loading.
5. Save/reload, undo/redo and export a still image immediately after insertion. Compare the result to the settled viewport.
6. Recheck Kinetic Mobile Presentation and Nebula Music Experience. Existing animated export format limitations remain unchanged.


## Persistence and device follow-up

- Project format v4 includes the saved playhead, exact camera position/target and selection. Older template projects without view state open at their template poster time. An explicitly saved time of zero remains zero.
- Camera reset/restore recreates orbit controls to clear residual orbit damping, and restores the pose when the actual render camera mounts. This addresses the reversed text/back-facing camera state visible in the bug references without flipping correctly oriented GLBs.
- IndexedDB promises resolve after transaction commit, and transaction aborts reject. Load/parse failures no longer silently become empty projects. Legacy records are removed only after migration succeeds.
- Saves are revision-aware. Local writes proceed independently of slow cloud uploads; both local writes and cloud uploads are ordered. A stale completion cannot mark newer edits saved. Remote freshness compares document timestamps, not timestamps changed by sharing/thumbnail updates.
- Asset metadata now lives in IndexedDB beside the binary store. Hydration is deduplicated, retriable on errors and completed before rendering project layers. Missing assignments are retained and reported instead of silently replaced by template artwork.
- Every device card has an explicit Add blank action. Replacing a selected device retains that layer's edits; adding creates a new clean device with a front-facing hero transform, no inherited media and no template animation.
- The rebuilt original unbranded devices have independently rounded thin enclosures. The tablet has a camera island, connector/port and speaker details. The laptop has an open lid, hinge, notched display, keyboard legends, trackpad, speaker grilles, ports and feet. Keyboard-font attribution is bundled.

The persistence integration suite runs the actual storage/service/store pipeline against a standards-compatible IndexedDB implementation. It covers edited versions of all five templates, saved visual time and pose, layer ordering, overlay preservation, keyframes, blank devices, media bytes/MIME metadata/object-URL regeneration, aborts, corrupt records, asynchronous save races and slow/offline cloud uploads. Media byte round-trips are not image/video decoding or visual browser tests.
