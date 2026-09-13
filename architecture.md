# Animated Device Mockup Studio — Architecture

## 1. Project Overview

This project is a browser-based device mockup and animation studio inspired by modern product-mockup editors.

Users can:

- Choose a device mockup (iPhone, iPad, MacBook, Android, browser, etc.)
- Upload an image or video
- Place the media inside the device screen
- Adjust position, scale, rotation, perspective and visual effects
- Create After Effects-style keyframe animations
- Preview the animation in the browser
- Save projects
- Export still images and animated videos
- Reuse animation templates

The architecture is designed to start as an MVP and grow into a production-grade SaaS application.

---

## 2. Product Goals

### Primary goals

1. Make device mockups easy to create without professional 3D software.
2. Provide a simple but powerful timeline/keyframe workflow.
3. Produce high-quality visual exports.
4. Keep the editor responsive while users manipulate 3D scenes.
5. Separate interactive preview rendering from final export rendering.
6. Make the system extensible for new devices, effects and templates.

### Non-goals for the first MVP

- Full replacement for Adobe After Effects.
- Advanced compositing with hundreds of layers.
- Real-time collaborative editing.
- Complex particle systems.
- Professional color-management workflows.

---

# 3. Recommended Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand

## 3D / Canvas

- Three.js
- React Three Fiber
- @react-three/drei

## Animation

- Custom timeline/keyframe engine
- Easing/interpolation utilities
- Optional GSAP for selected UI interactions
- Remotion for deterministic video rendering

## Backend

- Next.js API routes / server actions
- Supabase
- PostgreSQL

## Storage

Recommended:

- Cloudflare R2 or Amazon S3 for user assets
- Supabase Storage can be used for the MVP

## Video Rendering

- Remotion
- FFmpeg
- Dedicated rendering worker/server for production

## Deployment

Recommended:

- Vercel for web application
- Supabase for database/auth
- Cloudflare R2/S3 for assets
- Separate rendering infrastructure for heavy exports

---

# 4. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Web Browser     │
                         │                      │
                         │      Next.js App     │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      ┌──────────────┐       ┌──────────────┐      ┌──────────────┐
      │ Editor UI    │       │ 3D Renderer  │      │ Timeline     │
      │ React        │       │ Three.js/R3F │      │ Keyframes    │
      └──────────────┘       └──────────────┘      └──────────────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                            ┌────────────────┐
                            │ Zustand Store  │
                            │ Project State  │
                            └───────┬────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌──────────────┐      ┌──────────────┐
                  │ Supabase DB  │      │ Asset Storage│
                  │ PostgreSQL   │      │ R2 / S3      │
                  └──────────────┘      └──────────────┘

                                    │
                              Export Request
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Rendering Worker │
                           │ Remotion + FFmpeg│
                           └────────┬─────────┘
                                    │
                                    ▼
                              Exported File
                                    │
                                    ▼
                                 Download
```

---

# 5. Application Layers

## Layer 1 — Presentation

Responsible for:

- Toolbar
- Device selector
- Upload panel
- Canvas controls
- Properties panel
- Timeline
- Export modal
- Project management UI

No business logic should be deeply embedded inside visual components.

---

## Layer 2 — Editor State

Zustand should manage:

- Current project
- Selected layer
- Current timeline time
- Playback state
- Canvas state
- Device state
- Keyframes
- Editor preferences

Example:

```ts
interface EditorState {
  project: Project | null;
  currentTime: number;
  isPlaying: boolean;
  selectedLayerId: string | null;

  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  selectLayer: (id: string) => void;
}
```

---

## Layer 3 — Scene / Rendering

Three.js and React Three Fiber are responsible for:

- Device model rendering
- Screen textures
- Lighting
- Camera
- Shadows
- Background
- Materials
- Scene effects

The renderer should receive state from the editor store rather than directly manipulating UI state.

---

## Layer 4 — Animation Engine

The animation engine converts keyframes into current values.

Example:

```text
Keyframe A
time: 0
x: 0

Keyframe B
time: 2
x: 500

Current time: 1
        ↓
Interpolation
        ↓
x = 250
```

Core responsibilities:

- Find surrounding keyframes
- Calculate normalized progress
- Apply easing
- Interpolate values
- Return evaluated properties

---

# 6. Core Data Model

## Project

```ts
interface Project {
  id: string;
  userId: string;
  name: string;

  width: number;
  height: number;
  fps: number;
  duration: number;

  background: BackgroundConfig;

  layers: Layer[];

  createdAt: string;
  updatedAt: string;
}
```

---

# 7. Layer Architecture

Every object in the composition should be represented as a layer.

```ts
interface Layer {
  id: string;
  name: string;

  type:
    | "device"
    | "image"
    | "video"
    | "text"
    | "shape"
    | "camera";

  visible: boolean;
  locked: boolean;

  transform: Transform;

  animations: AnimationTrack[];

  metadata?: Record<string, unknown>;
}
```

This allows future support for additional layer types without redesigning the editor.

---

# 8. Transform Model

```ts
interface Transform {
  x: number;
  y: number;
  z: number;

  rotationX: number;
  rotationY: number;
  rotationZ: number;

  scaleX: number;
  scaleY: number;
  scaleZ: number;

  opacity: number;
}
```

Optional advanced properties:

```ts
interface VisualProperties {
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  shadow?: ShadowConfig;
}
```

---

# 9. Keyframe Architecture

Each animatable property should have its own track.

```ts
interface AnimationTrack {
  property:
    | "x"
    | "y"
    | "z"
    | "rotationX"
    | "rotationY"
    | "rotationZ"
    | "scaleX"
    | "scaleY"
    | "scaleZ"
    | "opacity";

  keyframes: Keyframe[];
}
```

Keyframe:

```ts
interface Keyframe {
  id: string;
  time: number;
  value: number | string;
  easing: EasingType;
}
```

Easing:

```ts
type EasingType =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "spring";
```

Future easing types can be added without changing the project structure.

---

# 10. Timeline

The timeline should support:

- Play
- Pause
- Stop
- Seek
- Scrubbing
- Zoom
- Keyframe creation
- Keyframe deletion
- Keyframe dragging
- Layer visibility
- Layer locking
- Timeline snapping

Example:

```text
00:00       01:00       02:00       03:00
 |-----------|-----------|-----------|

Device
 ●-----------------------●

Position X
 ●-----------●

Rotation
             ●-----------●

Opacity
 ●-------------------●
```

The timeline should use a single source of truth:

```ts
currentTime: number;
```

All animations should derive their values from this time.

---

# 11. Animation Evaluation

Recommended function:

```ts
evaluateTrack(
  track: AnimationTrack,
  time: number
): number
```

Pseudo-flow:

```text
Current Time
     ↓
Find previous keyframe
     ↓
Find next keyframe
     ↓
Calculate progress
     ↓
Apply easing
     ↓
Interpolate
     ↓
Return value
```

For example:

```text
t = 1 second

Keyframe A = 0
Keyframe B = 100

progress = 0.5

ease(progress)
      ↓
0.5

result = 50
```

---

# 12. Device System

Devices should be data-driven.

Do not hard-code every device inside the main renderer.

Recommended structure:

```text
devices/
  iphone/
    iphone.glb
    config.ts

  ipad/
    ipad.glb
    config.ts

  macbook/
    macbook.glb
    config.ts
```

Device configuration:

```ts
interface DeviceDefinition {
  id: string;
  name: string;

  modelUrl: string;

  screen: {
    width: number;
    height: number;

    position: [number, number, number];
    rotation: [number, number, number];

    uvScale?: [number, number];
    uvOffset?: [number, number];
  };

  defaultCamera: CameraConfig;
}
```

This allows a new device to be added mostly by creating a model and configuration.

---

# 13. Screen Texture System

Uploaded media should become a texture.

Flow:

```text
Upload Image
     ↓
Storage
     ↓
Public/Signed URL
     ↓
Texture Loader
     ↓
Three.js Texture
     ↓
Device Screen Material
```

For video:

```text
MP4/WebM
   ↓
HTMLVideoElement
   ↓
VideoTexture
   ↓
Three.js Screen Material
```

Important considerations:

- Handle CORS correctly.
- Use signed URLs for private assets.
- Dispose textures when layers are removed.
- Avoid loading unnecessarily large images.
- Generate thumbnails for the asset library.

---

# 13a. Text Rendering Architecture (implemented)

Text is a **first-class layer**, not an overlay. A text layer is an ordinary
`Layer` with `type: "text"`: its position, rotation, scale and opacity live in
the same `transform`, its keyframes live in the same `animations` array, and it
is saved, shared, undone and exported by the same code as a device. Nothing in
the timeline, the evaluator, the autosave loop or the export pipeline knows that
text exists, which is why adding it changed none of them.

## The decision that shapes everything: text lives in the 3D scene

Export renders the WebGL scene and composites it over the background. Anything
that is not in that scene — a DOM overlay, however convincing on screen — is
simply **absent from every PNG**. So text is rendered as an object in the same
Three.js scene as the device.

Each text layer is rasterised to a 2D canvas and mapped onto a plane:

```text
content + style
      ↓  text-layout.ts     measure, wrap, reveal
      ↓  text-renderer.ts   fillText → <canvas>
      ↓  THREE.CanvasTexture
      ↓  plane in the layer group
      ↓  same camera, same render, same export
```

Four things follow from that choice, and each of them was the reason for it:

| | Why the canvas route |
|---|---|
| **Export** | Text is in the scene the exporter already renders. No second pipeline, no compositing step, no way for the two to disagree. |
| **Languages** | `fillText` runs the browser's own shaping engine, so Sinhala and Tamil conjuncts, Devanagari matras, Arabic joining and bidirectional runs are correct without a line of shaping code. `TextGeometry` cannot shape any of them. |
| **Depth** | A plane at a Z position occludes and is occluded by the device, because it is in the same scene with the same camera. Text behind a phone is a real depth test, not a z-index. |
| **Effects** | Gradient fill, stroke, shadow and blur are Canvas2D primitives, not shaders to write and maintain. |

The cost is that changing the words or the typeface means redrawing a texture.
Everything below exists to make sure that happens no more often than it must.

## What is a texture change, and what is a matrix change

This split is the core of the performance story.

| Changes the texture (redraw) | Changes the matrix or material (free) |
|---|---|
| content, font, weight, size, align, spacing, case, box width, stroke, shadow, backdrop, **reveal**, **blur** | position, rotation, scale, opacity, **and a solid fill colour** |

**Colour is usually free.** When the fill is solid and there is no stroke,
shadow or backdrop, the glyphs are drawn in white and coloured by the material
(`isTintable`). Changing the colour is then a single material write rather than
a redraw, and the fill drops out of the cache key — so the same words in ten
colours share one texture. A gradient, a stroke, a shadow or a backdrop each
bake their own colour into the drawing, and a material tint would multiply all
of it, so those keep painting the real colour.

An animating text layer therefore rasterises **once** and then costs a matrix
write per frame. Animated font size scales the plane rather than redrawing at a
new size; the supersampled texture absorbs it.

`reveal` and `blur` genuinely cannot be applied to an existing texture, so they
are handled by pre-rendering: the span they animate over is sampled into at most
48 pictures, de-duplicated by what is actually drawn, and swapped per frame. A
word reveal over eight words produces eight textures however finely it is
sampled.

### Filtering: the editor and an export want opposite things

The viewport shows a 1920-wide composition in roughly 700 pixels, minifying the
texture about 5×; without mipmaps, thin strokes shimmer as the camera moves. An
export renders the composition at its own size, so the texture is minified by
exactly the supersample factor — and there, bilinear sampling of the
full-resolution image *is* the ideal downsample, four texels averaged into one
pixel, while trilinear mipmapping blends two smaller levels and softens every
edge.

So the texture is mipmapped for editing, and `captureFrame` switches it to
`LinearFilter` for the duration of the render and restores it afterwards. Over
the text band of a 1080p export, the share of glyph pixels that are neither
background nor solid ink falls from 23.3% to 14.4%.

Raising the supersample to 3 was measured and rejected: at 4× zoom the result
is indistinguishable from 2, for 2.25× the texture memory.

### Texture cache

`text-renderer.ts` keeps a reference-counted cache keyed by everything that
affects the drawing. Two layers with the same styled words share one texture.
The budget is 96 MB; over it, entries with no users are disposed.

Measured with 50 text layers on screen, each with different content:

```text
50 layers → 50 textures, 39.4 MB
          → 1 draw call and 2 triangles per layer
```

## Fonts

`text-fonts.ts` holds a registry of 14 curated families plus 10 script-coverage
faces. Two rules:

1. **Never offer a font that will not render.** The picker lists the registry,
   and the weight list per family is the weights that family actually ships —
   so Bebas Neue offers 400 and nothing else rather than a synthesised bold.
2. **Never load a script's font until that script appears.** The CJK and Indic
   faces are large; loading them so Sinhala *might* work would cost every user
   who never types Sinhala.

The font stack for a run of text is built from what the text contains:

```text
"ඔබේ App එක"  →  Inter, "Noto Sans Sinhala", system-ui, …
```

The chosen family leads, so it draws everything it covers; a coverage font is
appended per script actually present; the system stack ends it so an emoji or a
stray symbol always lands on something.

> **`document.fonts.check()` cannot be used as the readiness gate.** It returns
> `true` for a family the browser has never heard of, on the grounds that
> *something* will be used to draw it. Trusting it means no stylesheet is ever
> requested and every layer silently renders in the fallback while the picker
> claims otherwise. The loader tracks the faces it has actually seen load.

## Script detection

`text-script.ts` answers one narrow question cheaply: which of the scripts
Framelo ships a font for is this text written in. It is not an implementation of
UAX #24 and does not need to be. Results are cached by string, because the same
handful of strings are re-measured on every keystroke and every reveal frame.

Latin is always included even when no Latin letter appears, because digits,
punctuation and spacing are Latin in text of every script.

## Editing

The text plane is in WebGL; the caret is not.

```text
display mode   plane in the scene          ← exports, shares, has depth
edit mode      transparent <textarea>      ← caret, selection, clipboard, IME
```

While a layer is being edited its plane hides and a textarea takes its place,
positioned and sized to match. This is not a shortcut: a caret drawn into a
texture would mean writing a text editor from scratch, and that is precisely
where multilingual input breaks. Every input method the browser supports works
because the browser is doing the work.

`TextCanvasOverlay` also draws the selection outline, the drag/rotate/resize
handles and the alignment guides. Positions are recomputed on an animation
frame and written straight to the DOM, never to React state — so the camera can
be orbited while text is selected and the outline follows without re-rendering
anything.

The outline is an **SVG polygon through the four projected corners**, not a CSS
box. A text layer can be rotated in three dimensions, and under perspective its
outline is a general quadrilateral with the near edge longer than the far one.
A `width`/`height`/`rotate` box can only describe the axis-aligned bounds, which
on a layer pitched 50° becomes a band across the whole viewport and makes a
perfectly good rotation look broken. The polygon is also the hit target, so
clicking the text means clicking the text at any angle.

A press that reaches the WebGL canvas itself — rather than a layer's outline or
a viewport button — clears the selection.

`text-viewport.ts` holds the projection maths: world → screen for the box,
screen delta → world for a drag (measured at the layer's own depth, so a drag
tracks the pointer exactly), and screen → world for placing a new layer.

## Animation

Text adds five animatable properties to the existing keyframe system —
`fontSize`, `letterSpacing`, `lineHeight`, `reveal` and `blur` — as ordinary
tracks on the ordinary `animations` array. The same keyframes, the same easing,
the same evaluator. What differs is only where the evaluated number is *read*:
transform properties become a matrix, these become typography.

`evaluateTransformWith` skips any track that is not a transform property, so a
typography track can never corrupt the matrix.

`reveal` is the one that earns its place. It runs 0 → 1 and says how much of the
text is shown, which makes typewriter and letter/word reveals a normal animation
curve: scrubbable, serializable, and identical in the editor, in an export and
in a shared link. A timer ticking characters out is none of those things.

## Units

`PIXELS_PER_WORLD_UNIT = 248` is derived, not chosen. The default camera sits at
z 7.6 with a 32° vertical field of view, so it sees `2 × 7.6 × tan(16°) ≈ 4.359`
world units of height. A 1080-tall composition is therefore ~248 pixels per
unit — which is what makes a 64px font measure 64 real pixels in a 1080p export
rather than an arbitrary number that happens to look about right.

## Persistence and safety

Text is stored inside the existing project JSON, in `layer.metadata`. No new
table, no new store, no new save path; the debounced autosave already covers it,
and typing coalesces into one history entry rather than one per character.

Text is drawn with `fillText` and never inserted as markup, evaluated, or handed
to a style attribute — so there is no injection surface. The risk is duller:
a project from local storage, a share link or a future build can carry a NaN
font size, a zero line height, a colour the canvas rejects or a megabyte of
content, and any of those breaks the editor rather than the layer.
`text-safety.ts` therefore clamps every field into a range that can be drawn on
the way in, at the same boundary that validates the rest of the project.

## Files

```text
engine/text/
  text-types.ts          model, defaults, unit conversion
  text-script.ts         Unicode script detection, RTL
  text-fonts.ts          registry, stack building, lazy loading
  text-layout.ts         measurement, wrapping, reveal slicing
  text-renderer.ts       rasterisation, texture cache
  text-safety.ts         normalising untrusted stored data
  text-viewport.ts       scene ↔ screen projection
  text-style-presets.ts  typography presets
engine/motion/
  text-presets.ts        15 text motion presets
components/text/
  TextLayerObject.tsx    the scene object
  TextCanvasOverlay.tsx  selection, handles, editing field
  TextProperties.tsx     the inspector
  TextToolPanel.tsx      the Text tab
```

---


---

# 14. Canvas Architecture

Canvas should have these conceptual elements:

```text
Scene
├── Camera
├── Lights
├── Background
├── Device Layer
│   ├── Device Model
│   └── Screen Texture
├── Image Layers
├── Video Layers
├── Text Layers
└── Effects
```

Recommended React component structure:

```text
<EditorCanvas>
  <Scene>
    <Camera />
    <Lights />
    <Background />
    <LayerRenderer />
  </Scene>
</EditorCanvas>
```

---

# 15. Camera System

Camera properties should be animatable.

```ts
interface CameraConfig {
  position: [number, number, number];

  rotation: [number, number, number];

  fov: number;
}
```

This enables cinematic animations such as:

- Zoom in
- Zoom out
- Camera orbit
- Perspective movement
- Product reveal

---

# 16. Background System

Support:

### Solid

```ts
{
  type: "solid",
  value: "#ffffff"
}
```

### Gradient

```ts
{
  type: "linear-gradient",
  from: "#ffffff",
  to: "#dddddd"
}
```

### Image

```ts
{
  type: "image",
  assetId: "..."
}
```

### Transparent

Useful for exporting overlays.

---

# 17. Asset Management

Users can upload:

- PNG
- JPG
- WebP
- SVG (optional)
- MP4
- WebM

Asset model:

```ts
interface Asset {
  id: string;
  userId: string;

  type: "image" | "video" | "audio";

  originalName: string;
  mimeType: string;

  storageKey: string;

  width?: number;
  height?: number;
  duration?: number;

  thumbnailUrl?: string;

  createdAt: string;
}
```

---

# 18. Storage Architecture

Recommended production flow:

```text
Browser
  │
  │ request upload URL
  ▼
Backend
  │
  │ signed upload URL
  ▼
R2 / S3
  │
  ▼
Asset Record
in PostgreSQL
```

Do not upload large media through the Next.js server unless necessary.

Direct-to-storage uploads are more scalable.

---

# 19. Database Schema

Recommended PostgreSQL tables:

```text
users
projects
project_layers
assets
templates
exports
```

Optional:

```text
subscriptions
usage_events
device_models
```

### projects

```text
id
user_id
name
width
height
fps
duration
project_json
created_at
updated_at
```

### assets

```text
id
user_id
type
original_name
mime_type
storage_key
width
height
duration
created_at
```

### exports

```text
id
project_id
user_id
format
resolution
status
progress
output_url
error_message
created_at
completed_at
```

---

# 20. Project JSON Strategy

For MVP, store the entire editor state as JSON.

Example:

```json
{
  "version": 1,
  "canvas": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 5
  },
  "background": {
    "type": "solid",
    "value": "#ffffff"
  },
  "layers": []
}
```

Always include a version:

```json
{
  "version": 1
}
```

This makes future migrations possible.

---

# 21. Autosave

The editor should autosave.

Recommended behavior:

```text
User changes project
       ↓
Debounce 1–2 seconds
       ↓
Save project JSON
       ↓
Supabase
```

Do not send a database request for every mouse movement.

For high-frequency interactions:

```text
Mouse movement
     ↓
Local Zustand state
     ↓
No DB request

Mouse released / debounce
     ↓
Persist
```

---

# 22. Undo / Redo

Undo/redo is important for an editor.

Recommended approach:

```text
Past states
    ↓
Current state
    ↓
Future states
```

Actions should be command-oriented:

```ts
addLayer()
deleteLayer()
updateTransform()
addKeyframe()
deleteKeyframe()
moveKeyframe()
```

This makes undo/redo easier to implement than storing arbitrary UI changes.

---

# 23. Export Architecture

Exports should NOT depend on the browser preview alone.

Recommended:

```text
Editor
  ↓
Project JSON
  ↓
Export API
  ↓
Render Job
  ↓
Queue
  ↓
Rendering Worker
  ↓
Remotion
  ↓
FFmpeg
  ↓
Storage
  ↓
Download
```

---

# 24. Export Formats

MVP:

- PNG
- JPG
- WebM

Production:

- MP4
- GIF
- WebM
- PNG sequence

Recommended video settings:

```text
Resolution:
1920x1080
1080x1920
1080x1080

FPS:
24
30
60
```

---

# 25. Render Worker

Rendering is CPU/GPU intensive.

Do not perform long renders inside the normal Next.js request lifecycle.

Instead:

```text
POST /api/exports
      ↓
Create export record
      ↓
Queue job
      ↓
Worker picks job
      ↓
Render
      ↓
Upload output
      ↓
Update export status
```

Export states:

```ts
type ExportStatus =
  | "queued"
  | "rendering"
  | "completed"
  | "failed";
```

---

# 26. Export Progress

Worker should report progress:

```text
0%
10%
25%
50%
75%
100%
```

Frontend can use:

- polling
- Server-Sent Events
- WebSocket

For MVP, polling is sufficient.

Example:

```text
GET /api/exports/:id
```

---

# 27. Template System

Templates allow users to apply pre-built animations.

Example template:

```json
{
  "id": "iphone-reveal",
  "name": "iPhone Reveal",
  "duration": 4,
  "keyframes": {
    "scale": [],
    "rotationY": [],
    "positionY": []
  }
}
```

Applying a template should modify project state rather than create a separate rendering system.

---

# 28. Recommended Template Types

Initial templates:

1. Product Reveal
2. Device Spin
3. Zoom In
4. Zoom Out
5. Slide In
6. Slide Out
7. Floating Device
8. Cinematic Rotation
9. Screen Reveal
10. Social Media Promo

---

# 26a. Template Architecture (implemented)

A template is a **starting project**; a motion preset is **only animation**.
That separation is enforced structurally, not by convention:

| | Project template | Motion preset |
|---|---|---|
| May change | canvas, background, device, finish, the whole layer set, duration | animation tracks, and nothing else |
| Applied by | `applyProjectTemplate(template, layers)` | `applyMotionPreset(layerId, preset, options)` |
| Undo | one step, layers included | one step |

`buildTemplateLayers` is **pure**: given a template and the project's existing
device layer, it returns the complete layer list. Nothing in it touches a store,
which is what lets the catalogue test assert that ten templates genuinely differ
rather than that ten buttons exist.

```text
ProjectTemplate
  canvas · device · finish · background
  deviceTransform        ← where the device sits and how far it is turned
  textLayers[]           ← content, typography, placement, per-layer motion
  motionPresetIds[]      ← device motion
      ↓  buildTemplateLayers(template, existingDevice)
  Layer[]                ← device + text, with real keyframes already generated
      ↓  applyProjectTemplate(template, layers)     one commit, one undo
```

The user's uploaded screen image is carried across. A template supplies a
composition; discarding the screenshot somebody just uploaded because they
tried a layout would be the most annoying thing this feature could do.

## Enforcing that templates differ

`templateSignature` reduces a template to the decisions that make a
composition — canvas shape, device position, yaw, scale, text placement,
typeface, weight, alignment — and **excludes colour on purpose**. The catalogue
test asserts no two collide, so "ten templates" cannot quietly become one
composition with ten palettes.

> **A gotcha worth knowing.** `fontSize` is pixels at a 1080-tall composition.
> The camera always shows the same 4.36 world units of height whatever the
> canvas is, so on a 1920-tall frame every size renders about 1.8× larger. The
> portrait template's headline was authored at a landscape size first and ran
> clean off both edges.

---

---

# 26b. Device Motion Template Architecture (implemented)

## Three libraries, one animation engine

| | Owns | Produces |
|---|---|---|
| `engine/motion/motion-presets.ts` | animation tracks for one layer | `AnimationTrack[]` |
| `engine/templates/device-motion-templates.ts` | a device pose + a whole choreography + the composition length | `AnimationTrack[]` and a `Transform` |
| `engine/templates/project-templates.ts` | canvas, background, device, text layers, motion | `Layer[]` |

All three end in the same place: ordinary Framelo keyframes. There is exactly
one generator (`motion/preset-generator.ts`) and one evaluator, and nothing
downstream — timeline, scrubbing, undo, autosave, share, export — can tell a
generated animation from a hand-keyed one.

`device-motion-builder.ts` is the adapter that keeps it that way. A choreography
carries more than a preset does (a pose, a camera, optional text), but its
*movement* is the same normalised `MotionTrackSpecs`, so `asPreset()` wraps it
in the shape the existing generator already understands. That six-line function
is the reason there is no second animation system.

## Why a choreography owns the pose and a preset does not

A preset must never move the layer's resting transform. Stacking Float onto a
device the user parked at the left of frame has to leave it at the left of
frame, or presets stop being composable.

A choreography is only coherent at the pose it was designed for — Orbit Hero is
meaningless if the device is not turned to meet the arc, and Dolly Zoom is
invisible if it is not turned at all. So it owns the pose, says so on its card,
and asks before taking it. `buildDeviceMotion(..., { keepPosition: true })`
exists for the case where the caller wants the rotation without the placement.

## Files

```
src/engine/templates/
  device-motion-templates.ts   the fifteen, as data
  device-motion-builder.ts     pure: template -> transform + tracks
  device-motion.test.ts        the uniqueness rules, enforced
  catalogue-integrity.test.ts  invariants spanning all three libraries
src/components/motion/
  DeviceMotionBrowser.tsx      search, filter, favourites, preview, apply
  DeviceMotionCard.tsx         card + the origin diagram
src/components/library/
  LibraryBrowser.tsx           the four tabs
```

## Ids are namespaced

`dm-` prefixes every device motion template id. Three of them — Orbit Hero,
Product Turn, Dolly Zoom — name concepts the motion preset library already has
an id for, and a project stores both a `templateId` and a
`deviceMotionTemplateId`. Without the prefix a bare `dolly-zoom` would be
ambiguous the first time anything resolved one without knowing which catalogue
it came from. A test asserts the namespaces never collide.

## Enforcing that choreographies differ

`deviceMotionSignature` reduces a template to the *shape* of its motion: which
properties, how many beats on each, where they fall, which way the values go,
and the resting pose. Names, descriptions, tags and categories are excluded, so
a template that differed from another only in its label collides.

A second, blunter rule: no two may animate the same set of properties. Two
templates that move exactly the same properties are almost always the same idea
twice, and fifteen entries in a library are worthless the moment two of them
feel alike.

Browser verification measures the same thing empirically — it samples each
template's transform through the real evaluator at nine points across its run
and compares trajectories, then renders frames at three moments mid-flight. See
features.md §15c for what that caught.

---

# 39a. Font Architecture (implemented)

## Self-hosted, lazily, through an explicit table

`engine/text/font-loaders.ts` is the only file that names a Fontsource package.
It maps a font id to a list of thunks:

```ts
inter: {
  family: "Inter Variable",
  normal: [() => import("@fontsource-variable/inter/index.css")],
  italic: [() => import("@fontsource-variable/inter/wght-italic.css")],
}
```

**Why thunks and not a computed path.** `import(`@fontsource-variable/${id}/index.css`)`
is the obvious shape and the wrong one: bundlers cannot resolve a template
literal to a module, and whatever context they do resolve would be a directory
of every font at once — exactly the eager loading this is built to avoid.
Explicit thunks are statically analysable, so each family becomes its own chunk
that arrives when first used, and a typeface with no entry here cannot be
registered at all.

## The family name is a CSS detail, the id is the contract

Fontsource names variable packages `"Inter Variable"`. A project stores
`fontId: "inter"` and never the CSS family, so moving a family from static to
variable changes `family` and leaves every saved composition alone. A test
asserts the registry's `family` matches the package's, because a mismatch
resolves to nothing, falls through to the system stack, and is invisible until
someone exports.

## Readiness

`document.fonts.check()` cannot answer "is this font loaded" — it returns `true`
for a family the browser has never heard of. So faces that have actually loaded
are tracked in a `Set`, and `fontsReadyFor` consults that. This was a real bug:
trusting `check()` meant no stylesheet was ever requested and every text layer
silently rendered in the system fallback while the picker claimed otherwise.

## The remote exception

`CDN_COVERAGE_FONTS` holds exactly three entries — Noto Sans KR, JP and SC.
Those packages are tens of megabytes installed. Everything else, including
Sinhala, Tamil, Devanagari, Bengali, Arabic, Hebrew and Thai coverage, is
vendored. A test asserts the list has three entries so a fourth cannot be added
by accident.

---

# 10a. Timeline Architecture (implemented)

## Selection lives in the editor store, as a list

`selectedKeyframes: KeyframeSelection[]` replaced `selectedKeyframe`. Everything
that acts on "the selection" — nudge, delete, copy, re-time, re-ease — reads
that list, so single-select is a selection of one and there is no second code
path for it.

Clipboard entries are stored **by value** with times relative to the earliest
copied keyframe. An id would collide the moment it was pasted twice; absolute
times would make paste mean "put it back where it came from", which is what
duplicate is for.

## Batch operations are store actions, not component logic

`nudgeKeyframes`, `removeKeyframes`, `duplicateKeyframes`, `setKeyframesEasing`,
`pasteKeyframes` and `cropAnimation` all take `KeyframeRef[]` — a layer id, a
property and a keyframe id — because a marquee crosses tracks and layers, and
"delete what is selected" has to mean exactly that.

Each walks the project **once per layer**, not once per keyframe: dragging forty
selected keys should not mean forty passes over the layer array and forty new
project objects for one gesture.

Each is a single `commit`, so a group operation is one undo.

## The group clamp

`nudgeKeyframes` clamps the delta once for the whole group, against the earliest
keyframe in it. Clamping each keyframe individually lets the earliest pile up at
zero while the rest keep moving, which silently destroys the timing — the one
thing a group drag must never do. Mutation-tested.

## Drag measures against reality

A drag computes its delta against where the keyframe *actually is* in the store,
not against an accumulated total. Because the group clamps, an accumulator
drifts out of step the moment a drag pushes the earliest key against zero.

## Row geometry is derived once

`timeline-model.ts` turns the layer list into a flat row layout, which the
marquee uses to convert a dragged rectangle back into "which keyframes did that
cross". Deriving it inside the pointer handler would mean recomputing the whole
layout on every mouse move.

Marquee hits come from **track rows only**. The layer summary row shows the same
keyframes again as an aggregate, and counting them twice would make a group of
four report as eight and then move twice as far when nudged.

## Performance

- the playhead and the timecode are positioned imperatively from a store
  subscription — React never re-renders the timeline while the clock runs
- each keyframe marker subscribes only to whether *it* is selected
- zoom is anchored at the cursor: the time under the pointer stays still, so
  zooming in on a keyframe does not walk it off the panel
- the marquee ignores movements under 4px, so a click that wobbles is a click

---

# 20a. Work Area and Duration (implemented)

`CanvasConfig.workArea?: { in, out, enabled }`, added in project version 3.

On the composition rather than in the editor for two reasons: it is a decision
about the piece, so it should survive closing the tab; and the exporter reads
it, so it has to be in the project the exporter is handed.

`enabled` exists so the range survives being switched off — someone who sets an
in/out, exports the whole composition once and switches it back on should find
the range they set.

`resolveWorkArea(canvas)` is the single reader. Absent or disabled resolves to
the full composition, and the result is always clamped to the duration, so no
caller has to handle a range that has drifted out of bounds.

**Migration.** v2 projects have no work area, which already means "the whole
composition", so there is nothing to backfill. The migration's job is to bound a
range that is out of step with the duration — possible if a composition was
shortened by an older build — and to drop one that has collapsed to zero length,
since a range with no width is not a range and cannot be dragged apart again.

**Cropping is never implicit.** `cropAnimation(duration)` exists and the UI calls
it only after a confirmation that names how many keyframes will go. Shortening
the composition on its own leaves the animation alone: a composition is allowed
to be shorter than its animation.

---

# 12a. Easing Registry, extended (implemented)

`EASING_TYPES` is append-only — a name that has ever been written to a project
must keep resolving — so `expo`, `circ` and `quint` went on the end.

`cubic` and `quart` were deliberately **not** added. `easeIn`, `easeOut` and
`easeInOut` *are* the cubic family, and `smooth` and `sharp` are quart-out and
quart-in-out. Adding second names for curves already present would put two chips
in the easing editor that do the same thing. Instead `EASING_LABELS` carries the
family in brackets, so someone looking for "quart" finds it behind the name
"Smooth" rather than asking for a curve the library already has.

Easing is stored **by name**, never as bezier control points. A project written
today still eases correctly when the implementation of `smooth` improves, and
the motion library, the evaluator and the editor cannot disagree about what a
curve is. The editor's curve preview is sampled from the real function via
`sampleNamedEasing`, so the preview and the export cannot drift.

---

# 19a. Project Schema, version 3

```
canvas.workArea?         { in, out, enabled }
templateId?              which project template built this
deviceMotionTemplateId?  which choreography is on the device
exportSettings?          { format, resolutionId, transparent, range }
```

All four are optional, so a v2 project parses unchanged and a v3 project written
by a newer build still opens in an older one with its unknown fields intact
(§73). No database migration is required: Supabase stores the whole project
object in `projects.project_data` as JSON, and local storage stringifies the
same object — so new project state persists, syncs, duplicates and travels
through a share link by construction rather than by being plumbed through.

Device finish ids are also append-only. `black`, `white` and `blue` went on the
end of `DeviceFinishId` and onto the schema's allowlist; nothing was renamed.

# 27a. Motion Preset Architecture (implemented)

> Supersedes the sketch in §27 above. This section describes what is actually
> built; the sections either side are kept as the original spec.

## Two libraries, deliberately separate

| | Motion Preset | Project Template |
|---|---|---|
| Lives in | `engine/motion/` | `engine/templates/` |
| May change | animation tracks **only** | canvas, device, finish, background, duration, animation |
| Applied by | `applyMotionPreset` | `applyProjectTemplate` |
| UI | left sidebar → Motion | left sidebar → Templates |

This split is enforced structurally, not by convention: `applyMotionPreset` has
no access to canvas, background or device fields, so a motion preset *cannot*
change them even by mistake. Someone reaching for "Device Spin" wants their
existing composition to spin — having it also swap their device and wipe their
background would be indefensible.

Templates ask for confirmation before applying; presets do not, because a preset
is cheap to try and one undo takes it back.

## Files

```text
engine/motion/
  preset-types.ts       MotionPresetDefinition, parameters, categories
  motion-presets.ts     the catalogue (33 live + retired), search, resolution
  preset-generator.ts   definition + parameters -> AnimationTrack[]
  easing.ts             spring simulation and curve sampling
  preset-preview.ts     preview state, outside React and outside the project
engine/templates/
  project-templates.ts  8 starting-project configurations
```

## Presets are data

A preset is a list of normalised keyframes per property plus a declaration of
which parameters it honours:

```ts
{
  version: 1,
  id: "cinematic-reveal",
  name: "Cinematic Reveal",
  category: "cinematic",
  duration: 4,
  description: "Scale, position and rotation resolving together.",
  tags: ["cinematic", "hero", "product", "reveal", "premium"],
  supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
  tracks: {
    scaleX: [
      { at: 0, value: 0.86, scaled: true, easing: "smooth" },
      { at: 0.85, value: 1, easing: "linear" },
    ],
    // ...
  },
}
```

`at` is normalised to [0, 1], so a preset fits any composition length without
being rewritten. Adding a preset is adding an object — no component, no branch,
no new code path. `supports` exists so the parameter panel only offers controls
that do something: a turntable has no meaningful direction, and showing one
would teach people the panel is decorative.

## Generation

`generateTracks(preset, context, parameters)` is the **only** bridge between the
library and the project format, and it is one-way. It produces ordinary
`AnimationTrack`s and then the preset stops existing — nothing downstream
(timeline, evaluator, scrubbing, export) knows a preset was involved. That is
what keeps a generated animation exactly as editable as a hand-keyed one, and
what stops this becoming a second animation engine.

Parameters:

- **intensity** scales *travel*, never the destination. Rise In at intensity 2
  starts twice as far below but still lands exactly where the user put the
  device — scaling the resting value would move their composition.
- **direction** mirrors specs marked `directional`, on position and rotation only.
- **easing** overrides per-keyframe easing, but only where `supports.easing` is
  set: forcing `elastic` onto a turntable would put a visible hitch in a
  seamless loop.
- **delay** eats into the span rather than extending it, so keyframes can never
  land past the end of the composition.
- **spring** bakes; see below.

## Spring

A spring is a differential equation, not a curve: its shape depends on mass,
stiffness and damping, which the project format has no way to name. Rather than
teaching the evaluator physics, `simulateSpring` integrates it (semi-implicit
Euler, fixed 1/240s step, hard 12s cap) and `bakeSpring` writes the result out
as ordinary keyframes with linear segments.

So a sprung entrance scrubs, exports and edits like anything else, and the user
can drag the resulting keyframes afterwards. Only the first segment is sprung —
that is where the motion arrives; springing every segment turns a considered
settle into a wobble.

The UI exposes one **Spring intensity** dial mapped onto a band that is always
stable. The raw mass/stiffness/damping triple is behind *Advanced*.

## Easing

`EASING_TYPES` gained `smooth`, `sharp`, `back`, `elastic` and `spring`. The
list is **append-only**: a name that has ever been written to a project must
keep resolving, so curves are added to the end and never removed or repurposed.

Overshoot curves deliberately return values outside [0, 1] — that is what makes
motion read as designed rather than tweened. `elastic` is damped harder than the
textbook curve (peak ~1.26 rather than ~1.37), because a 37% overshoot on a
product mockup reads as a glitch.

## Preview

Preview must never touch the project — not "should not": the moment a preview
writes to the project store it becomes undoable, autosaves, marks the project
dirty, and can be left behind by a mis-click.

So `presetPreview` holds the generated tracks outside React and outside the
project, and `DeviceRenderer` / `DeviceShadow` read them inside their existing
`useFrame` loops in place of the layer's own. It also runs its own clock, so
previewing never moves the user's playhead — which is restored simply by never
having been touched.

Preview and Apply call the same generator, so what plays is exactly what gets
written.

## Stacking and conflicts

`mergePresetTracks` leaves properties the incoming preset does not touch
completely alone. That is what makes presets stackable: Scale In owns the
`scale*` tracks, Device Spin owns `rotationY`, and applying both gives you both.

Where they do collide the incoming track wins, and the caller is told which
properties were overwritten — so the user is warned *before* it happens, in a
dialog, rather than discovering it afterwards.

## Duration

`planDuration` surfaces the decision rather than making it. "Fit" compresses the
preset proportionally (every keyframe keeps its relative position, so the motion
looks the same, just faster); "Extend" grows the composition. Silently
stretching a five-second composition to twelve because someone clicked
Turntable Loop is the kind of "helpful" that loses work.

## Undo

One `commit` per preset, so the whole application — every track, every keyframe,
and any duration change — is a single undo. Requiring twenty undos to take back
one click is the classic way a generated-keyframe feature becomes unusable.

## Backward compatibility

Applying a preset flattens it into ordinary keyframes, so **no project file has
ever stored a preset id**. Screen Fade could therefore be removed from the
catalogue with no migration: projects that used it simply contain an opacity
track, which keeps working untouched.

`LEGACY_MOTION_PRESETS` nonetheless keeps the retired definitions resolvable
(`screen-fade`, `cinematic-zoom`, `slide-in`, `floating-device`) so a template,
a shared link or a future "reapply this preset" feature can never dangle. They
are excluded from the browser, from search, from favourites resolution and from
new-project starters — `isLegacyPreset()` is the guard, and a test asserts no
template references one.

## Performance

No preset card instantiates a 3D scene. Each card draws an SVG sparkline
generated from the preset's own keyframe data, so thirty cards are thirty tiny
paths rather than thirty WebGL contexts and thirty device models. The real
device scene is used only when the user explicitly previews.

---

# 29. UI Architecture

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo        Project Name                    Export           │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│ Device       │                              │ Properties    │
│ Library      │                              │               │
│              │           Canvas              │ Position      │
│ Upload       │                              │ Scale         │
│ Assets       │                              │ Rotation      │
│              │                              │ Opacity       │
│ Templates    │                              │ Effects       │
│              │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│                         Timeline                              │
│                                                              │
│ Device      ─────●──────────────────────●────────────        │
│ Position    ───────────●────────●──────────────────          │
│ Rotation    ─────────────────●────────────●────────          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 30. Component Structure

```text
components/
│
├── editor/
│   ├── EditorShell.tsx
│   ├── TopBar.tsx
│   ├── LeftSidebar.tsx
│   ├── RightSidebar.tsx
│   ├── EditorCanvas.tsx
│   └── Timeline.tsx
│
├── devices/
│   ├── DeviceLibrary.tsx
│   ├── DeviceCard.tsx
│   └── DevicePreview.tsx
│
├── assets/
│   ├── UploadButton.tsx
│   ├── AssetLibrary.tsx
│   └── AssetCard.tsx
│
├── properties/
│   ├── TransformPanel.tsx
│   ├── AppearancePanel.tsx
│   └── AnimationPanel.tsx
│
├── export/
│   ├── ExportDialog.tsx
│   └── ExportProgress.tsx
│
└── ui/
```

---

# 31. Folder Structure

Recommended project structure:

```text
mockup-studio/
│
├── app/
│   ├── (dashboard)/
│   │   ├── projects/
│   │   ├── templates/
│   │   └── editor/
│   │
│   ├── api/
│   │   ├── projects/
│   │   ├── assets/
│   │   └── exports/
│   │
│   ├── login/
│   └── page.tsx
│
├── components/
│
├── devices/
│   ├── iphone/
│   ├── ipad/
│   └── macbook/
│
├── engine/
│   ├── animation/
│   ├── interpolation/
│   ├── easing/
│   └── scene/
│
├── store/
│   ├── editor-store.ts
│   ├── project-store.ts
│   └── asset-store.ts
│
├── lib/
│   ├── supabase/
│   ├── storage/
│   └── validation/
│
├── types/
│   ├── project.ts
│   ├── layer.ts
│   ├── animation.ts
│   └── device.ts
│
├── renderer/
│   └── remotion/
│
├── public/
│   └── devices/
│
└── package.json
```

---

# 32. API Design

## Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

## Assets

```text
POST /api/assets/upload-url
POST /api/assets/complete
GET  /api/assets
DELETE /api/assets/:id
```

## Exports

```text
POST /api/exports
GET  /api/exports/:id
POST /api/exports/:id/cancel
```

---

# 33. Validation

Use Zod for project JSON validation.

```ts
const ProjectSchema = z.object({
  version: z.number(),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  duration: z.number(),
  layers: z.array(LayerSchema)
});
```

Never trust project JSON coming from the browser.

---

# 34. Performance Strategy

The editor should prioritize interaction speed.

## Avoid

- Saving on every mouse move
- Rebuilding the entire Three.js scene for every property change
- Loading full-resolution assets unnecessarily
- Creating duplicate textures
- Rendering expensive effects when the canvas is idle

## Use

- Zustand selectors
- Memoization
- Texture caching
- Lazy loading
- Debounced persistence
- Low-resolution preview assets
- GPU effects only when necessary

---

# 35. Preview vs Final Rendering

Use different quality levels.

### Preview

```text
Lower resolution
Lower samples
Real-time interaction
Fast playback
```

### Final export

```text
Full resolution
Higher quality
Deterministic frames
Motion blur
High-quality shadows
```

This prevents the editor from becoming slow.

---

# 36. Device Model Optimization

GLB/GLTF models should be optimized before shipping.

Recommended:

- Reduce polygon count
- Compress textures
- Use Draco/Meshopt where appropriate
- Use KTX2/Basis textures where supported
- Remove unused objects
- Keep screen geometry simple

---

# 37. Security

Important:

- Authenticate every project request.
- Verify project ownership.
- Never trust user-provided storage paths.
- Use signed URLs for private assets.
- Validate file types.
- Enforce file size limits.
- Sanitize filenames.
- Rate-limit export requests.
- Add export quotas for free users.

---

# 38. File Upload Limits

Suggested initial limits:

```text
Images: 25 MB
Videos: 250 MB
```

Production limits can depend on subscription level.

---

# 39. SaaS / Monetization Architecture

Future plans:

### Free

- Limited projects
- Watermarked exports
- 720p exports
- Limited devices

### Pro

- Unlimited projects
- 1080p/4K
- No watermark
- More devices
- Premium templates
- Longer animations

### Team

- Shared projects
- Collaboration
- Brand assets
- Team libraries

---

# 40. Analytics

Track useful events:

```text
project_created
asset_uploaded
device_added
animation_created
template_applied
export_started
export_completed
export_failed
```

Do not collect unnecessary personal data.

---

# 41. Error Handling

Every export should have a clear failure state.

Example:

```json
{
  "status": "failed",
  "error": {
    "code": "RENDER_FAILED",
    "message": "The render worker could not process the project."
  }
}
```

User-facing messages should be simple.

Technical details should go to server logs.

---

# 42. MVP Development Roadmap

## Phase 1 — Editor Foundation

Build:

- Next.js project
- Editor layout
- Zustand state
- Canvas
- One iPhone model
- Camera controls
- Background controls

Goal:

> Render a controllable iPhone inside the browser.

---

## Phase 2 — Media

Build:

- Image upload
- Storage
- Image preview
- Screen texture
- Asset library

Goal:

> User uploads an image and sees it inside the phone.

---

## Phase 3 — Animation

Build:

- Timeline
- Play/pause
- Scrubbing
- Keyframes
- Position animation
- Scale animation
- Rotation animation
- Opacity animation
- Easing

Goal:

> User can create a complete 5-second animation.

---

## Phase 4 — Project System

Build:

- Authentication
- Create project
- Save
- Autosave
- Load
- Rename
- Delete

Goal:

> Projects persist between sessions.

---

## Phase 5 — Export

Build:

- PNG
- WebM
- MP4
- Export queue
- Render worker
- Progress tracking

Goal:

> User can download a finished animation.

---

## Phase 6 — Device Library

Add:

- iPhone
- iPad
- MacBook
- Android
- Browser
- Apple Watch

Goal:

> Build a reusable device ecosystem.

---

## Phase 7 — Templates

Build:

- Template library
- Apply template
- Save custom templates
- Premium templates

---

## Phase 8 — Advanced Effects

Add:

- Motion blur
- Depth of field
- Reflection
- Glow
- Shadow
- Camera animation
- Environment lighting

---

# 43. Suggested First MVP Scope

Do NOT build everything initially.

The first usable version should contain only:

```text
1 device
+
1 image upload
+
3D preview
+
position
+
scale
+
rotation
+
timeline
+
keyframes
+
playback
+
PNG export
```

After this works reliably, implement video export.

---

# 44. Definition of Done — MVP

The MVP is complete when a user can:

1. Open the editor.
2. Select an iPhone.
3. Upload an image.
4. See the image inside the phone screen.
5. Move the phone.
6. Scale the phone.
7. Rotate the phone.
8. Add a keyframe.
9. Move the timeline.
10. Add a second keyframe.
11. Play the animation.
12. Save the project.
13. Reload the project.
14. Export a PNG.
15. Export an animated video in a later phase.

---

# 45. Important Engineering Principle

The most important architectural decision is to keep these systems separate:

```text
Editor UI
     │
     ▼
Editor State
     │
     ├──────────────► Preview Renderer
     │
     └──────────────► Export Renderer
```

Both preview and export should consume the same project representation.

This prevents the common problem where an animation looks correct in the browser but renders differently during export.

---

# 46. Long-Term Architecture

Eventually the platform can evolve into:

```text
                 Mockup Studio
                       │
        ┌──────────────┼───────────────┐
        │              │               │
     Devices        Templates        Assets
        │              │               │
        └──────────────┼───────────────┘
                       │
                  Animation Engine
                       │
              ┌────────┴────────┐
              │                 │
          Live Preview       Renderer
              │                 │
          WebGL/R3F        Remotion/FFmpeg
              │                 │
              └────────┬────────┘
                       │
                    Export
```

---

# 47. Final Recommendation

Build the product incrementally.

The correct first milestone is NOT:

> "Build a full After Effects clone."

Instead:

> "Build a beautiful iPhone mockup editor that lets a user upload an image, animate the device with keyframes, and export the result."

Once this core loop works:

```text
Upload
  ↓
Place
  ↓
Animate
  ↓
Preview
  ↓
Export
```

everything else can be layered on top without replacing the core architecture.

This architecture intentionally separates the editor, animation engine, 3D renderer, persistence layer and export pipeline so the project can scale from a portfolio/MVP application into a full SaaS product.
