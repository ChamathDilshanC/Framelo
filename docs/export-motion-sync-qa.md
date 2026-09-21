# Export, motion and cloud save follow-up

- Fixed signed JavaScript XOR values producing malformed project UUIDs. Stable valid legacy mappings stay unchanged. Failed saves remain local and retry on reconnect; the save badge now exposes the server failure or missing sign-in/configuration reason.
- New manually authored keyframes default to Smooth In Out (quintic smoothstep: zero endpoint velocity and acceleration). Existing curve names keep their saved behavior. Playback advances at R3F priority -100 before layer evaluation instead of a separate requestAnimationFrame loop.
- All five displayed export formats are implemented: PNG, JPG, WebP, MP4/H.264 and WebM/VP9 or VP8. The video pipeline uses Mediabunny CanvasSource with explicit timestamps, encoder backpressure, work-area range and composition FPS. WebM can retain transparency. Unsupported codecs/resolutions report a real error. Video currently has no audio track.
- Export pauses playback, stops motion previews, waits for devices/fonts/textures, seeks screen videos per frame, and restores the playhead/play state after completion, failure or cancellation. Export time does not become saved editor state. Backgrounds rasterize once per movie. Video module is dynamically loaded.
- API reference: https://mediabunny.dev/guide/quick-start and https://mediabunny.dev/api/CanvasSource

## Verification

Tests cover malformed UUID inputs, queue retry, local-only status, smooth curve endpoints, exact export timestamps, work-area endpoints, cancellation, encoder failures and restoration. Encoder/browser boundaries are mocked in unit tests: these tests do not establish actual hardware codec support or visual fidelity.

Manual checks still needed: authenticated save then reopen on another device; 30/60 FPS MP4/WebM at each resolution; playback in an external player; transparent WebM; uploaded screen-video seek accuracy; cancellation midway through a longer export. Browser verification was unavailable in this session.
