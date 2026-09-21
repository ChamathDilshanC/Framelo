# Premium device scenes

Six studio templates replace the three previous Tablet, Laptop and Multi-device catalogue entries. Mobile definitions are unchanged. Existing saved projects still resolve the previous bundled artwork.

The latest request's **fifth image** (floating commerce laptop) is the primary composition benchmark. The other references inform crimson editorial treatment, lime contrast, amber architecture, device angles and warm floor illumination. No supplied artwork or third-party identity is embedded in the scenes.

| Template | Devices | Duration | Composition |
| --- | --- | --- | --- |
| Crimson Editorial Tablet | iPad | 7s | Offset red tablet, oversized type, two editorial folios |
| Neon Portfolio Tablet | iPad | 7s | Lime portfolio, three orbiting project cards, geometric grid |
| Midnight Sales Laptop | MacBook | 7s | Lower-right laptop, orange type, receding website panels |
| Floating Commerce Laptop | MacBook | 7s | Five independent commerce windows over a floating laptop |
| Amber Agency Ecosystem | MacBook, iPad, iPhone | 8s | Upper device ensemble, amber architecture, lower headline |
| Lime Digital Campaign | MacBook, iPad, iPhone | 8s | Bold upper typography, diagonal foreground phone, metric cards |

All scenes use 1080 × 1350 at 60fps. Normal device, image and text layers carry every transform, asset and keyframe. Quint-out entrances are staggered; smooth-in-out hold motion changes device orientation by less than one degree. Atmosphere uses animated transparent image layers. The existing neutral PBR device lighting rig remains shared with the editor and previews; these scenes do not introduce per-template 3D lights.

Screen art and UI-panel illustrations are original vector SVGs. Each UI panel is an independent replaceable image layer; text within its SVG is not a separate text layer. Poster headings, labels and metadata are independently editable text. The optional hand overlay was omitted. No device is flattened.

## Automated evidence

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test -- --reporter=dot`: 29 files, 655 tests passed.
- `npm run build`: passed.
- The real IndexedDB project-storage tests cover edits, layer order, camera state, media hydration and exact project restoration for all templates.
- Additional per-scene tests replace every device independently with PNG, JPG, WebP, MP4 and WebM asset records, save, close and reopen. They verify byte restoration, asset type, independent assignments and unchanged transforms/keyframes. These fixtures test storage, **not browser media decoding**.
- Motion checks cover valid/nonconstant native tracks, ordered keyframes, staggered card entrances, three distinct models per ecosystem and ongoing hold movement.
- GLB tests verify iPad/MacBook screen geometry, UV orientation and independent screen materials.
- `node scripts/verify-premium-artwork.mjs` decodes all studio SVGs and produces `screen-artwork.png`. This contact sheet shows **screen artwork only**, not rendered scene thumbnails.

## Visual acceptance still pending

No browser or app surface was available to the computer-use tool in this session (`apps: []`, `browsers: []`). Consequently the following were not verified in a running editor and must not be treated as passed:

- Rendered composition at entrance, poster frame and end of hold, for each of the six scenes.
- Actual browser PNG/MP4 decoding and screen replacement on all devices.
- Three-device playback frame rate and GPU memory stability.
- Exported still-frame pixel comparison against the editor.
- Visual comparison between each live Template Browser preview and its applied scene.

The Template Browser uses `TemplatePreview`, which constructs the actual template layers and renders the same device/text/image components at the authored poster time. There is no separate polished marketing thumbnail.

## Reproduction

Run `npm run dev`, open the Template Browser, and inspect each of the two entries in Tablet, Laptop and Multi-device. Apply each scene, scrub through 0–3.5s, then play the hold. Replace each device screen independently, save and reload, and export a 1080 × 1350 PNG at 3.5s for comparison. For the two ecosystem scenes, repeat with video playing on all three screens.

Regenerate bundled SVGs with `node scripts/generate-premium-artwork.mjs`. No runtime generator or network artwork request is involved.
