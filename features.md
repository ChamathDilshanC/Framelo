# Animated Device Mockup Studio — Feature Specification

## 1. Product Summary

Animated Device Mockup Studio is a browser-based creative tool for creating polished device mockups and short product animations.

The core experience is:

```text
Choose Device
     ↓
Upload Image / Video
     ↓
Place Media on Screen
     ↓
Customize Device
     ↓
Animate with Keyframes
     ↓
Preview
     ↓
Export
```

The product should feel closer to a lightweight combination of:

- Device mockup generator
- Figma-style canvas
- After Effects-style timeline
- Simple 3D product animation tool

---

# 2. Feature Priorities

Features are divided into:

- P0 — Required for MVP
- P1 — Important after MVP
- P2 — Advanced
- P3 — Future / SaaS features

---

# 3. Editor Features

## P0 — Editor Workspace

The main editor should contain:

- Top navigation
- Device/asset sidebar
- Main canvas
- Properties panel
- Timeline
- Play/pause controls
- Undo/redo
- Export button

### Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo       Project Name                  Save   Export       │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│ Devices      │                              │ Properties    │
│ Assets       │            Canvas             │               │
│ Templates    │                              │ Transform     │
│              │                              │ Appearance    │
│              │                              │ Animation     │
├──────────────┴──────────────────────────────┴───────────────┤
│                        Timeline                              │
└──────────────────────────────────────────────────────────────┘
```

---

# 4. Device Library

## P0

Initial device:

- iPhone

The device should support:

- 3D rotation
- Position
- Scale
- Screen media
- Shadow
- Background

## P1

Add:

- iPad
- MacBook
- Android phone
- Browser window
- Apple Watch

## P2

Add:

- Multiple iPhone generations
- Multiple MacBook models
- Desktop monitor
- Tablet variants
- Generic smartphone
- Generic laptop

## P3

Allow users to upload/import custom `.glb`/`.gltf` device models.

---

# 5. Device Customization

## P0

Users can control:

- X position
- Y position
- Scale
- Rotation X
- Rotation Y
- Rotation Z
- Opacity

## P1

Add:

- Perspective
- Device color
- Material
- Reflection
- Shadow intensity
- Shadow softness
- Environment lighting

## P2

Add:

- Depth of field
- Bloom
- Motion blur
- Cinematic lighting
- HDR environment

---

# 6. Image Upload

## P0

Supported:

- PNG
- JPG
- JPEG
- WebP

User flow:

```text
Upload
  ↓
Preview
  ↓
Select asset
  ↓
Apply to device screen
```

Features:

- Drag and drop
- File picker
- Image preview
- Replace image
- Remove image
- Fit to screen
- Crop
- Cover
- Contain

---

# 7. Video Upload

## P1

Supported:

- MP4
- WebM

Features:

- Video preview
- Trim
- Start time
- End time
- Loop
- Mute
- Volume
- Fit/crop

Video should be rendered as a screen texture.

---

# 8. Asset Library

## P0

Show uploaded assets in a library.

```text
Assets

[Image] [Image] [Image]
[Image] [Video] [Image]
```

Each asset should provide:

- Thumbnail
- Name
- Type
- Size
- Delete
- Add to canvas

## P1

Add:

- Search
- Sort
- Folders
- Favorites
- Recently used

---

# 9. Canvas

## P0

Canvas controls:

- Pan
- Zoom
- Fit to screen
- Center
- Reset view

Canvas should support:

- Device
- Image
- Background

## P1

Add:

- Multiple layers
- Text
- Shapes
- Guides
- Alignment
- Snap
- Safe areas
- Rulers

---

# 10. Backgrounds

## P0

Support:

- Solid color
- Transparent background

## P1

Support:

- Linear gradient
- Radial gradient
- Background image

## P2

Support:

- Animated gradient
- Noise
- Particles
- 3D environment

---

# 11. Timeline

## P0

Timeline must support:

- Play
- Pause
- Stop
- Seek
- Scrub
- Duration
- FPS
- Current time indicator

Example:

```text
00:00     01:00     02:00     03:00     04:00
 |---------|---------|---------|---------|

Device
 ●----------------------------●

Position
 ●----------●

Rotation
             ●----------------●

Scale
 ●----------------●
```

---

# 12. Keyframe Animation

## P0

Animatable properties:

- X
- Y
- Z
- Rotation X
- Rotation Y
- Rotation Z
- Scale X
- Scale Y
- Scale Z
- Opacity

Actions:

- Add keyframe
- Delete keyframe
- Move keyframe
- Copy keyframe
- Paste keyframe

---

# 13. Easing

## P0

Include:

- Linear
- Ease In
- Ease Out
- Ease In Out

## P1

Add:

- Cubic Bezier editor
- Back
- Elastic
- Bounce

## P2

Add:

- Spring physics
- Custom easing presets

---

# 14. Animation Presets

## P1

Users can apply ready-made animations.

Presets:

### Slide In

```text
Start:
X = -500

End:
X = 0
```

### Zoom In

```text
Start:
Scale = 0.7

End:
Scale = 1
```

### Spin

```text
Rotation Y:
0° → 360°
```

### Fade

```text
Opacity:
0 → 1
```

### Float

Subtle continuous movement.

---

# 15. Templates

## P1

Template gallery.

Example templates:

1. Product Reveal
2. iPhone Showcase
3. App Launch
4. Device Spin
5. Cinematic Zoom
6. Social Media Promo
7. App Store Preview
8. Website Showcase
9. SaaS Product Demo
10. Floating Device

Template card should show:

- Preview
- Name
- Duration
- Device
- Apply button

---

# 15a. Motion Presets (implemented)

> Supersedes §14 and §15 above, which are kept as the original spec.

The left sidebar has two separate libraries, and the distinction is the point:

- **Motion** changes animation and nothing else.
- **Templates** set up a whole starting project.

## Motion — the library

33 curated presets across seven categories:

| Category | Presets |
|---|---|
| Entrance | Rise In · Slide In Left / Right / Top / Bottom · Scale In · Pop In · Soft Reveal |
| Exit | Fade Out · Slide Out Right |
| Movement | Float · Drift · Bounce · Sway · Hover |
| 3D | Device Spin · Half Spin · Turntable · Tilt Reveal · 3D Flip · Orbit |
| Cinematic | Cinematic Reveal · Hero Push · Camera Push · Cinematic Drift · Focus Reveal |
| Product | Product Reveal · Hero Product · Product Turn · Floating Product · Showcase |
| Loop | Floating Loop · Sway Loop · Turntable Loop · Cinematic Loop |

### Browsing

- **Search** across name, description, category and tags. Tags are what make it
  scale: searching "spin" returns Device Spin, Half Spin, Turntable, Orbit,
  Product Turn and Turntable Loop, most of which do not have "spin" in the name.
- **Categories** as a horizontally scrolling chip row — a wrapping three-row
  block would push the presets themselves below the fold in a 256px sidebar.
- **Recent** — the last five applied.
- **Favourites** — stored locally, never gated behind an account.

Recent and Favourites are hidden while searching: a search is a specific
question, and these would bury the answer.

### The card

Compact: a sparkline glyph drawn from the preset's own keyframes, name,
description, duration, category, a loop marker where the motion is seamless, and
a favourite heart. It expands into its parameters only when selected.

### Parameters

Only the controls the preset actually honours are shown.

| Control | Effect |
|---|---|
| Intensity | Scales travel, never the destination |
| Direction | Mirrors the motion left / centre / right |
| Easing | Overrides the designed curve |
| Delay | Offsets the start, without overrunning the composition |
| Spring intensity | Bakes a simulated spring into the settle |
| Advanced → mass / stiffness / damping | The raw spring, for people who want it |

### Preview vs Apply

**Preview** plays the preset on the real device using temporary state. It does
not touch the project, does not move the playhead, does not mark anything
unsaved and cannot be left behind — `Escape` stops it from anywhere, and it
stops itself after 12 seconds.

**Apply** writes real Framelo keyframes onto the timeline, where they can be
dragged, re-eased and deleted like any hand-keyed animation.

### Stacking

Presets that touch different properties combine. Scale In owns the scale tracks;
Device Spin owns Rotation Y; applying both gives both.

When two presets *do* collide, a dialog says exactly which properties will be
replaced before anything happens. One undo takes the whole application back.

### Duration

If a preset is longer than the composition, Framelo asks rather than assumes:

- **Fit preset** — compress proportionally; the motion looks the same, just faster.
- **Extend project** — grow the composition to the preset's length.

### Keyboard

| Key | Action |
|---|---|
| `R` | Preview the selected preset |
| `Enter` | Apply the selected preset |
| `Esc` | Stop the preview |

## Templates — starting projects

Eight configurations, each defining canvas, device, finish, background, duration
and opening motion:

Product Launch · App Showcase · App Store Preview · SaaS Product ·
Portfolio Hero · Mobile App Promo · Minimal Product · Cinematic Device

Applying one replaces the canvas size, device, background, duration and
animation, so it asks for confirmation first. The uploaded screen image is kept
— that is the user's content, not part of the template's look.

## Retired

**Screen Fade** is no longer in the library; Soft Reveal replaces it. Projects
made with it are unaffected: applying a preset flattens it into plain keyframes,
so no project file ever referenced it by name.

---

# 15b. Templates and motion, after the catalogue rewrite (implemented)

## Ten project templates

Each one is a whole composition, not a colour scheme:

| Template | Canvas | What makes it different |
|---|---|---|
| Minimal Product Hero | 1920×1080 | Device square to camera and centred, one headline, nothing else |
| Dark Cinematic Product | 1920×1080 | Device pushed right and turned away, serif headline in the left third |
| Gradient Startup Launch | 1920×1080 | Device low and tilted, two stacked lines owning the top half |
| Editorial Device Showcase | 1920×1080 | Device *in front of* the headline, mono label, magazine asymmetry |
| Floating Glass | 1920×1080 | Frosted plates behind the type, device drifting on three axes |
| Social Media Portrait | 1080×1920 | Vertical, condensed caps up top, device filling the lower frame |
| SaaS Dashboard Reveal | 1920×1080 | Device left, a column of copy right — the feature-section shape |
| Luxury Product | 1920×1080 | Device at two-thirds size, enormous whitespace, letter-spaced caps |
| Bold Tech | 1080×1080 | Square, device turned 34°, type at the size of the frame |
| Portfolio Case Study | 1920×1080 | Title and a metadata line, device arcing in from the right |

Three canvas shapes, ten different device poses, nine typefaces, and every one
brings its own text layers and motion.

**Uniqueness is enforced, not claimed.** `templateSignature` reduces a template
to the decisions that make a composition — canvas shape, device position, yaw
and scale, text placement, typeface, weight, alignment — and deliberately
*excludes colour*. The catalogue test asserts no two signatures collide, so a
template that differed from another only in palette fails the build.

Applying a template replaces the layer set, canvas, background and duration in
one commit — so it is one undo — and keeps the screen image you uploaded.

## Fifteen signature motion presets

Chosen for what the existing 39 could not do. The library was first mapped by
which properties each preset animates; these fill the gaps.

| | |
|---|---|
| Entrance | Magnetic Rise · Spring Land · Swing In · Drift In · Scale Bloom · Snap Hero · Elastic Settle · Corner Reveal |
| Cinematic | Depth Push · Dolly Zoom |
| Product / 3D | Rotational Hero · Orbit Hero |
| Movement | Kinetic Ascend |
| Loop | Parallax Float · Light Sweep |

Five mechanisms the library did not previously have:

- **Anticipation** — Magnetic Rise sinks before it lifts
- **Counter-motion** — Dolly Zoom pushes in while scaling back
- **Squash and stretch** — Spring Land parts the scale axes on impact
- **A resting pose that is not square** — Rotational Hero settles at an angle
- **Diagonal travel** — Corner Reveal arrives from a corner

Durations run from 0.75s (Snap Hero) to 7s (Parallax Float), so they are
genuinely different tools rather than one timing repeated.

> **Two of the requested fifteen already existed.** Cinematic Reveal and Tilt
> Reveal were already in the library with those exact concepts, so adding them
> again would have been the aliasing the brief forbids. Dolly Zoom and Corner
> Reveal took their places.

---

# 15c. Device motion templates (implemented)

There are now **three** libraries, and the boundaries between them are the
architecture rather than a filing convention:

| | Changes | Reach | Stacks? |
|---|---|---|---|
| **Motion preset** | animation tracks | one layer | yes |
| **Device motion template** | the device's pose *and* its whole choreography, plus the composition length | the device layer | no — it replaces |
| **Project template** | canvas, background, device, text layers, motion | the whole project | no — it replaces |

A preset is a verb you apply to something. A device motion template is a
finished shot: where the device rests, how long the run is, which way the camera
looks, and every beat between. A project template is a starting point.

The rule from §13 still holds in both directions — applying a motion preset can
never touch your background, device or text, and a device motion template never
touches your canvas size or your text layers.

## The fifteen

| Template | Direction | Duration | The mechanism |
|---|---|---|---|
| Floating Hero | bottom → centre | 4.2s | Arrives, then never fully stops — a micro-float tail |
| Vertical Drop | top → centre | 1.9s | Lands with a squash: the only template where the scale axes part |
| Vertical Lift | bottom → centre | 1.7s | `expo` rise with an overshoot and a backward tip |
| Spin Entrance | 3D rotation | 2.2s | A 250° turn on `circ` while growing into place |
| Flip Reveal | 3D rotation | 1.8s | Face-down around X, coming forward through depth as it opens |
| Horizontal Slide | left → centre | 1.7s | Leans into the travel in Z-roll and rights itself |
| Right Sweep | right → centre | 1.9s | Enters turned away in yaw and squares up on arrival |
| Diagonal Reveal | diagonal → centre | 2.0s | Both position axes on one curve, so the path is a true straight line |
| Orbit Hero | orbital | 4.6s | X and Z a quarter-cycle out of phase — an arc, not a slide |
| Product Turn | 3D rotation | 5.0s | A seamless 360° with a depth breath that returns exactly to zero |
| Cinematic Push | depth push | 6.0s | 5.2 units of real Z travel on `expo`, not a scale-up |
| Dolly Zoom | depth pull | 3.2s | Depth and scale cancel; the perspective changes, the size does not |
| Magnetic Landing | diagonal → centre | 2.4s | Anticipation — it moves *away* before it moves toward |
| Card Flip | 3D rotation | 1.5s | A half turn on `sharp`, slowest at the edge-on midpoint |
| Premium Showcase | centre → outward | 7.0s | Five beats that deliberately do not line up |

All ten movement directions the brief lists are covered, and a test asserts it.

## Uniqueness is enforced, not claimed

No two templates animate the same set of properties, and `deviceMotionSignature`
compares the *shape* of every track — how many beats, where they fall, which way
the values go — plus the resting pose. Names, descriptions and tags are excluded
on purpose, so a sixteenth template that differed from a fifteenth only in its
label fails the build.

Browser verification goes further and samples each template's trajectory through
the real evaluator at nine points across its run, then renders frames mid-flight
and compares them.

> **What that caught.** Dolly Zoom originally travelled 2.6 units with a 1.42
> scale, which cancelled so precisely that the shot was indistinguishable from a
> device sitting still — the perspective change was real but too small to see.
> It now travels 5.6 units and rests at a 28° yaw, because a phone seen face-on
> is a flat rectangle with no perspective to change. The visible difference
> between it and an ambient float went from 44 to 873 pixels in 4096.

## Preview

Preview plays the real thing — the same builder Apply uses — through the same
non-mutating channel the motion presets use: generated tracks held outside the
project and read by the renderer in place of the layer's own. There is no code
path from Preview to the project store, which is why "preview must not mutate
the project" is true by construction rather than by care. Verified in the
browser by comparing the serialised project byte for byte during a preview.

Applying asks first, names what it will change, and is one undo.

---

# 15d. The library browser (implemented)

Four catalogues, one panel, four tabs — **Templates · Device Motion · Motion
Presets · Text Presets** — with a one-line description of each tab's reach,
because the question anyone actually has is "which of these will wreck what I
have already done".

Each tab has its own search, category chips, favourites and recents. Only the
visible tab is mounted: four browsers alive at once would mean four search
boxes and, worse, a preview left running where nobody can see it.

**Motion Presets** shows the general library; **Text Presets** shows the
presets that only make sense on text. The split is by what a preset is *for*,
not by what it can be applied to — Rise In animates Y and opacity and works
perfectly well on a headline, so it stays in the general library rather than
being duplicated.

Screen Fade remains retired: it is absent from every browser and from both
template catalogues, and tests assert both.

---

# 16c. Typography, self-hosted (implemented)

## Fonts are no longer fetched from Google

Framelo used to inject a `<link>` to the Google Fonts CDN. Typefaces are now
**self-hosted via Fontsource**, and most of them are real variable fonts.

Three reasons, in order of how much they mattered:

1. **A shared project depended on a third party.** Someone opening a share link
   on a locked-down network got the composition with the wrong typography and no
   indication why. Fonts are part of a design; a design that renders differently
   depending on the viewer's network is not one.
2. **Every text layer leaked a request to another origin.**
3. **Variable fonts were being served as static instances** — one download per
   weight instead of one download per family.

## The library

Twenty-one families, in four categories:

| | |
|---|---|
| **Sans** | Inter · DM Sans · Manrope · Plus Jakarta Sans · Urbanist · Poppins · Montserrat · Open Sans · Roboto |
| **Display** | Space Grotesk · Outfit · Syne · Archivo · Sora · Bebas Neue |
| **Serif** | Source Serif 4 · Playfair Display · DM Serif Display · Merriweather |
| **Mono** | JetBrains Mono · IBM Plex Mono |

Seventeen are variable. The six that predate the migration are kept regardless
of fashion: they appear in saved projects and in the template catalogue, and
dropping one would silently restyle somebody's work.

## Loading

Nothing loads until it is used. Each family is a dynamic `import()` of its
Fontsource stylesheet, which the bundler has already split into its own chunk,
so a project that only uses Inter downloads only Inter. The font picker loads
each row's face through an `IntersectionObserver`, so families you never scroll
past are never fetched.

**The registry cannot offer a font it cannot load.** `font-loaders.ts` is a
table of explicit import thunks — not a computed path, which bundlers cannot
resolve and which would pull in every font at once — and a test asserts that
every family in the picker has an entry, declares the same CSS family name the
package does, and only claims a real italic when the package ships one.

## The one remaining remote request

Chinese, Japanese and Korean coverage still comes from the CDN. Those three Noto
families are tens of megabytes installed, two orders of magnitude more than
every other font here combined. They are listed in one named constant so the
tradeoff is visible, and a test asserts the list has exactly three entries — a
fourth would mean a font had quietly become a network dependency again.

Sinhala, Tamil, Devanagari, Bengali, Arabic, Hebrew and Thai coverage **is**
self-hosted.

## The picker

Search, category chips, and every row rendered in its own typeface at your text,
your weight and your style. A dropdown of family names is useless for choosing a
typeface — the whole decision is what the letters look like — and it doubles as
the honest test of the loader: a family that fails to arrive visibly falls back,
so you see it before you commit rather than after you export.

## Text animation

Nineteen text presets now, covering everything the brief lists: Fade In, Slide
Up/Down/Left/Right, Gentle Scale, Quick Pop, Bounce In, Blur Reveal, Typewriter,
Word Reveal, Letter Reveal, **Line Reveal**, **Mask Reveal**, Tracking Reveal,
**Letter Scatter**, **Glitch Lite**, Kinetic Rise and Cinematic Text.

Three of the new ones are honest approximations, and say so in the code:

- **Mask Reveal** has no alpha mask. A real one needs a second render pass per
  text layer; this sweeps the reveal edge across at a constant rate while the
  line slides the other way, which is what a mask wipe looks like.
- **Letter Scatter** does not give each glyph its own path. The text renderer
  draws a line into one canvas texture by design — that is what makes Sinhala
  conjuncts and Arabic joining come out right — so the scatter is built from
  collapsing tracking, an unwinding roll and a character reveal. The letters do
  genuinely arrive at different times and converge.
- **Glitch Lite** is the readable half of a glitch: hard offsets on `linear`
  segments with a flickering opacity. No RGB separation, which would need shader
  work and would look different in the export than in the editor.

---

# 11b. The timeline, after the motion-design pass (implemented)

## Selection

- click to select, **shift-click** to add, **ctrl/cmd-click** to toggle
- **marquee** — drag on empty grid; shift-drag adds to what is selected
- click a track's name in the label column to select every keyframe on it

Dragging a keyframe that is already part of a selection moves the whole
selection and does not collapse it first. Getting that wrong is the classic way
a multi-select timeline becomes useless.

## Editing

| | |
|---|---|
| Drag | moves everything selected, together |
| Alt-drag | leaves a copy behind and drags the copy |
| Alt held during a drag | ignores snapping |
| ← → | one frame; **Shift + ← →** one second |
| Ctrl/Cmd + C / V | copy, paste at the playhead |
| Ctrl/Cmd + D | duplicate |
| Delete | remove the selection |
| Right-click | the actions menu |
| Ctrl/Cmd + wheel | zoom, anchored at the cursor |

A group drag clamps **once for the whole group**, not per keyframe. Clamping
each one individually lets the earliest key pile up at zero while the rest keep
moving, which silently destroys the timing — a test asserts it does not.

## Snapping

To frame boundaries, and to the playhead within a few pixels. Toggled by the
magnet in the timeline header, separately from the canvas alignment guides —
they are different jobs, and someone working to the frame wants one without the
other.

## The inspector

A selected keyframe shows its **time**, its **value** and its **easing**, and
all three are editable. Time steps by exactly one frame, because that is the
only increment that cannot leave a keyframe between two frames where it will
never be the one that renders. With several selected the panel says so and
offers the operations that make sense for a group.

## The easing editor

Twelve named curves with a preview **sampled from the real easing function the
renderer will use**, so what is shown is what will play. Overshoot curves are
drawn beyond the box on purpose — `back`, `elastic` and `spring` genuinely leave
the 0–1 range, and flattening them would hide the one thing that makes them
worth choosing.

Three curves were added for this: **Expo**, **Circ** and **Quint**. `Cubic` and
`Quart` are deliberately *not* added, because they already exist under other
names — `easeIn`/`easeOut`/`easeInOut` are the cubic family, and `smooth` and
`sharp` are quart-out and quart-in-out. Those labels now carry the family in
brackets so anyone arriving from After Effects can find them. Two chips that did
the same thing would be worse than a name that needs a hint.

Framelo stores easing **by name**, not as bezier control points. That is a
deliberate constraint: a project written today still eases correctly when the
implementation of "smooth" improves, and the motion library, the evaluator and
the editor cannot disagree about what a curve is. Spring shapes are produced by
baking a simulated spring into ordinary keyframes rather than by teaching the
evaluator physics.

---

# 10b. Composition duration and the work area (implemented)

## Changing the duration

Lengthening is free and immediate. Shortening an animated composition asks how
the timing should change rather than silently deleting animation:

> **Fit animation to 5.00s?**
> 12 keyframes will be re-timed proportionally so the full animation fits
> exactly inside 5.00s.
> [Keep animation] [Fit keyframes]

**Fit keyframes** rescales every keyframe time against the old and new
composition lengths, in one undo. **Keep animation** shortens the composition
and leaves keyframe times alone — a composition is allowed to be shorter than
its animation, so lengthening it again brings the work back intact. Escape does
neither and changes nothing, because dismissing a dialog must never be an
action.

## In and out points

A strip above the tracks with a handle at each end. Drag either handle, drag the
middle to slide the range without changing its length, or type exact values in
composition settings. Everything outside the range is dimmed across every track.

The range lives on the **composition**, not in the editor: it is a decision
about the piece — "the good part is between two and five" — so it survives
closing the tab, and the exporter reads it. Switching it off keeps it, so
someone who exports the whole composition once finds their range still there.

Shortening the composition clamps the range rather than losing it.

---

# 25b. The export panel (implemented)

Reachable from **two** places — the toolbar's Export button and the Export
section at the bottom of the properties sidebar. Both call the same store
action, open the same dialog and run the same code path; the sidebar section
adds the format, size and range this project was last exported at, so deciding
whether to re-export does not require opening the dialog to look.

Export settings are remembered **on the project**, so they travel with it and
sync like any other edit rather than living in one browser.

The export is a readback of the live scene, so the device and its finish, the
screen image, the text layers with their real typefaces, the background, the
lighting and the camera all land in the file exactly as the viewport shows them.
Which frame is therefore a real setting: the playhead by default, with one-click
jumps to the start, the end and the work area's in point.

> **Video is still not available, and the panel says so.** WebM and MP4 are
> listed and honestly disabled rather than producing a still with a video
> extension. The range and frame rate are saved with the project so they are
> what the video renderer will use when it lands.

---

# 24b. Settings and the account (implemented)

The account comes first in Settings now — it is what people open the dialog to
check — and the identity is grouped as one fact rather than four nearby
settings: **avatar, name, email, provider**, with Sign out directly underneath.

The avatar is the provider's real picture when there is one. The fallback is the
person's **initials** — never a generated pattern, a gravatar or an identicon.
At 40px a made-up image is indistinguishable from a real one, so someone who has
never set a picture would believe Framelo had found one somewhere, and someone
whose Google picture failed to load would have no way to tell. A failed load
falls back to the initials rather than showing a broken frame.

Nothing is hard-coded: the name is the profile row the provider's identity was
adopted into, the email is the session's, and the provider comes from
`app_metadata`.

Signed out, the same section reads:

> **Guest mode**
> Your projects are saved locally. Sign in to sync them to your account and
> share them.
> [Sign in with Google]  ·  Or use an email address

---

# 5b. Device finishes (implemented)

Nine finishes: **Natural · Light · Dark · Black · White · Gold · Silver · Blue ·
Custom**.

Black and White sit beside Dark and Light rather than replacing them, and the
difference is real. Dark and Light are *anodised*: the tint is a shade of grey
with some of the model's own colour left in it, and rails and buttons are shaded
separately the way real hardware is. Black and White are *painted*: one colour
all the way across, no part shading, and a near-total mix so none of the GLB's
own paint survives.

Neither uses pure black or pure white — both destroy the shading information the
finish is applied on top of, and the device stops reading as an object. A test
asserts it.

Every finish goes through the same PBR path: cloned materials on the imported
model, with roughness and metalness of their own. Nothing here is a CSS filter,
and nothing touches the screen, the camera glass, the lenses or the sensors — so
a white phone keeps its black display and its clear lenses, and the reflections
and highlights are the renderer's.

---

# 16. Text Layers

## P1

Support text layers.

Properties:

- Text
- Font
- Font size
- Weight
- Letter spacing
- Line height
- Alignment
- Color
- Opacity

Animations:

- Position
- Scale
- Rotation
- Opacity

---

# 16a. Text Layers (implemented)

> Supersedes the sketch in §16 above, which is kept as the original spec.

Text is a real layer. It sits in the layer list beside the device, animates on
the same timeline, and is part of the 3D scene — so it exports, shares and can
sit in front of or behind the phone.

## Creating text

| | |
|---|---|
| `T`, or the **Text** tab | Arms the text tool |
| Click the canvas | Auto-width text at that point |
| Drag on the canvas | A text box of that width, which wraps |
| Double-click existing text | Edit it in place |
| `Esc` | Finish editing |

The tool disarms itself after one use, so the next click does not create a layer
nobody asked for. A new layer shows "Type something…" but stores nothing — a
user who creates text and clicks away is left with an empty layer, not those
words saved into their composition.

## Editing on the canvas

Clicking empty canvas clears the selection; clicking the text selects it again.

Selected text has an outline with handles, and the outline follows the layer
through a three-dimensional rotation rather than snapping back to a flat box:

- **Drag the box** to move. `Shift` locks to an axis; the composition centre
  snaps with a guide.
- **Arrow keys** nudge 1px, `Shift` + arrows 10px — real composition pixels.
- **Rotation handle** above the box sets Rotation Z. `Shift` snaps to 15°.
- **Corner handles** scale. **Side handles** change the width of a fixed-width
  box, which reflows the text rather than stretching the glyphs.

Editing uses a real text field, so the caret, selection, clipboard and every
input method the browser supports work normally. While editing, the keyboard
belongs to the text: `Space` types a space rather than starting playback, and
`Backspace` deletes a character rather than the layer.

## Typography

| Section | Controls |
|---|---|
| **Text** | Content, edit-on-canvas |
| **Typography** | Font, weight, style, size |
| **Color** | Solid or gradient fill, stroke |
| **Paragraph** | Alignment, line height, letter spacing, case, direction, box mode |
| **Effects** | Shadow, backdrop plate, reveal mode |
| **Transform** | Position, rotation, scale, opacity — the same panel every layer uses |
| **Animation** | Tracks and keyframes |

Size, line height and letter spacing carry keyframe toggles, like any animatable
property.

**14 fonts**: Inter · Roboto · Poppins · Montserrat · Open Sans · DM Sans ·
Manrope · Space Grotesk · Plus Jakarta Sans · Outfit · Bebas Neue · Playfair
Display · Merriweather · JetBrains Mono.

Only the weights a family actually ships are offered — Bebas Neue lists 400 and
nothing else, rather than a bold the typeface does not contain. Changing family
snaps the weight to the nearest one the new family has.

## Languages

Twelve scripts are supported, and the right font is fetched automatically when
one of them is typed:

| Script | Font | | Script | Font |
|---|---|---|---|---|
| Latin | Inter | | Bengali | Noto Sans Bengali |
| Sinhala | Noto Sans Sinhala | | Thai | Noto Sans Thai |
| Tamil | Noto Sans Tamil | | Korean | Noto Sans KR |
| Devanagari | Noto Sans Devanagari | | Japanese | Noto Sans JP |
| Arabic | Noto Sans Arabic | | Chinese | Noto Sans SC |
| Hebrew | Noto Sans Hebrew | | Cyrillic / Greek | Inter |

Mixed text works: `ඔබේ App එක` draws the Sinhala in Noto Sans Sinhala and the
Latin in the chosen family, in one line. Nothing is loaded until its script
appears, so a user who never types Sinhala never downloads it.

**Right-to-left** is detected automatically for Arabic and Hebrew, and can be
forced either way. A quoted English word inside an Arabic line does not flip the
paragraph. **Emoji** render in full colour through the system fallback.

## Text motion

A **Text** category in Motion Presets, offered only when text is selected:

| | |
|---|---|
| Entrances | Fade In · Slide Up / Down / Left / Right · Scale In · Pop In · Bounce In |
| Reveals | Typewriter · Word Reveal · Letter Reveal · Tracking Reveal · Blur Reveal |
| Statement | Kinetic Rise · Cinematic Text |

These are ordinary presets: applying one writes real keyframes onto the
timeline, editable like anything hand-keyed, and undone in a single step.
Device presets stay available for text — they are plain transform animations —
but text-only presets are hidden from devices, where a reveal track would
animate nothing.

**Typewriter and the reveals are keyframed, not timed.** A `Reveal` track runs
0 → 1 and the layer says what the fraction counts: characters, words or lines.
That is what makes them scrub backwards correctly, export at any single frame,
and replay identically from a shared link. **Blur Reveal is a real Gaussian
blur**, rasterised per frame, not a scale standing in for one.

## Text styles

Ten typographic starting points, separate from motion so the two combine:

Modern Headline · Minimal · Editorial · Bold Hero · Glass · Caption · Mono ·
Elegant · Tech · Gradient Hero

A style preset changes only typography. It never touches content, position or
animation — so Bold Hero and Cinematic Text can be applied together and neither
overwrites the other.

## Layers

Text layers appear in the layer list with a type icon, and support select,
rename, duplicate, delete, hide, lock and reorder. Reordering is drag-and-drop,
with Bring to Front / Forward / Backward / Send to Back in the layer menu, and
it changes what is actually drawn in front — not only the order of the list.

A duplicate keeps the style, content, transform and animation, takes a new id,
and is offset slightly so it is not hidden behind the original. A layer's name
follows its words until you rename it yourself, after which your name stays.

## Depth

Text has a Z position, so it can sit in front of the device or behind it. This
is a real depth test in the same 3D scene, not a stacking order — text behind a
phone is occluded by the phone.

## Export and sharing

Text is part of the scene the exporter renders, so it appears in **PNG, JPG and
WebP** exports at full resolution, at whatever frame the playhead is on, with
its font, colour, rotation and opacity intact. It survives save, reload, share
links, the public viewer and portfolio mode unchanged — including non-Latin
content and emoji.

## Limitations

- **One layer is selected at a time.** Shift-click multi-select is not
  implemented; the data model does not prevent it being added.
- **Reveal and blur sample to 48 frames** across the span they animate over.
  Beyond roughly 48 distinct steps a reveal quantises rather than stepping once
  per character.
- **Per-glyph transforms are not supported.** Letter and word reveals animate
  visibility and the line's own transform; individual glyphs cannot each carry a
  separate position or rotation.
- **A text texture is redrawn when its content or most of its style changes.**
  Scrubbing a font-size animation is free (the plane scales) and changing a
  solid colour is free (the material tints), but dragging the size slider
  redraws on each step.

---


---

# 16b. Signing in with work already made (implemented)

Framelo is usable signed out, so people arrive at an account with projects
already on the machine. When they sign in, Framelo **asks** rather than
uploading:

```text
Projects found on this device
You made 3 projects before signing in. Add them to your account?

  App Launch
  Portfolio Demo
  Client Pitch

[ Not now ]              [ Choose ]  [ Import all ]
```

Importing **copies** upward — nothing is removed from the device, so declining
costs nothing and a failed upload loses nothing. "Choose" opens a checklist for
signing in on a shared machine, or into a different account than the work
belongs in.

Uploading silently was the old behaviour and was wrong even though the files
were the user's own.

## Signing out

Sign out asks first, from both the account menu and Settings, and then returns
to the landing page. It keeps everything this device genuinely holds and drops
the metadata rows that belonged to the account — those were unopenable once
signed out, because their bodies only ever existed on the server.

---

# 17. Shape Layers

## P2

Support:

- Rectangle
- Circle
- Rounded rectangle
- Line
- Custom SVG

Properties:

- Fill
- Stroke
- Border radius
- Opacity

---

# 18. Multi-Layer System

## P1

Layers panel:

```text
Layers

👁 Device
🔒 Screen
👁 Title
👁 Background
```

Actions:

- Select
- Rename
- Hide
- Lock
- Delete
- Duplicate
- Reorder

---

# 19. Transform Controls

## P0

Properties panel:

```text
Position
X: 120
Y: 240

Scale
X: 100%
Y: 100%

Rotation
X: 0°
Y: 20°
Z: 0°

Opacity
100%
```

Support numeric inputs and sliders.

---

# 20. Direct Manipulation

## P1

Users should be able to drag objects directly on the canvas.

Support:

- Drag
- Resize
- Rotate
- Center
- Snap

Keyboard shortcuts:

```text
Delete
Backspace
Ctrl/Cmd + Z
Ctrl/Cmd + Shift + Z
Ctrl/Cmd + C
Ctrl/Cmd + V
Space = Play/Pause
```

---

# 21. Undo / Redo

## P0

Actions:

- Add layer
- Delete layer
- Transform
- Add keyframe
- Delete keyframe
- Move keyframe
- Change background
- Upload/replace media

History should be command-based.

---

# 22. Autosave

## P0

Automatically save projects after changes.

Recommended:

```text
Change
  ↓
Local state updates immediately
  ↓
1–2 second debounce
  ↓
Save to backend
```

Show:

```text
Saved
Saving...
Unsaved changes
```

---

# 23. Project Management

## P0

Users can:

- Create project
- Rename project
- Save project
- Open project
- Duplicate project
- Delete project

Project cards:

```text
My iPhone Promo
Last edited 5 minutes ago
[Open]
```

---

# 24. Authentication

## P1

Support:

- Email/password
- Google login
- Logout
- Password reset

Authentication should be handled through Supabase Auth.

---

# 25. Export

## P0

Still image export:

- PNG
- JPG

## P1

Video export:

- WebM
- MP4

## P2

Additional:

- GIF
- Transparent WebM
- PNG sequence

---

# 26. Export Settings

Users can select:

### Resolution

```text
720p
1080p
1440p
4K
```

### Aspect Ratio

```text
16:9
9:16
1:1
4:5
4:3
```

### FPS

```text
24
30
60
```

### Duration

```text
1–60 seconds
```

---

# 27. Export Queue

For video exports:

```text
Export
  ↓
Queued
  ↓
Rendering
  ↓
Processing
  ↓
Completed
```

UI:

```text
Rendering video...

██████████████░░░░ 72%

Estimated progress
```

---

# 28. Export Download

When complete:

```text
Export complete

[Preview]

[Download MP4]
```

Output files should be stored temporarily or according to the user's subscription/storage policy.

---

# 29. Shareable Projects

## P2

Generate a public project URL.

Example:

```text
/mockup/project/abc123
```

Permissions:

- Private
- Anyone with link
- Public

---

# 30. Embed Feature

## P3

Generate an embeddable preview:

```html
<iframe ...></iframe>
```

Useful for:

- Portfolio
- Product pages
- Landing pages
- Documentation

---

# 31. Responsive Design

## P0

Desktop-first editor.

Recommended minimum:

```text
1280px+
```

## P1

Tablet support.

## P2

Mobile viewer.

The full editor does not need to be optimized for phones in the first version.

---

# 32. Dark / Light Mode

## P1

Themes:

- Dark
- Light
- System

Editor should prioritize dark mode because it is suitable for creative tools.

---

# 33. Performance Features

The editor should:

- Lazy-load device models
- Cache textures
- Compress assets
- Use optimized GLB files
- Dispose unused textures
- Avoid unnecessary React renders
- Debounce autosave
- Use preview-quality rendering
- Separate preview from final rendering

---

# 34. Device Loading

When a user selects a device:

```text
Select device
     ↓
Load GLB
     ↓
Load textures
     ↓
Create scene
     ↓
Apply screen media
     ↓
Render
```

Display a loading state:

```text
Loading device...
```

---

# 35. Error States

Important errors:

- Invalid file
- File too large
- Upload failed
- Unsupported media
- Device loading failed
- Export failed
- Project save failed

Example:

```text
Something went wrong.

Your project is still available locally.
Try again.
```

---

# 36. Offline / Local Recovery

## P1

Use local browser storage for temporary recovery.

If the browser closes unexpectedly:

```text
Recovered unsaved project
```

This can use IndexedDB for larger state/assets metadata.

---

# 37. Project Versioning

Every project JSON should include:

```json
{
  "version": 1
}
```

If the data structure changes:

```text
version 1
   ↓ migration
version 2
```

This avoids breaking old projects.

---

# 38. Device Import

## P3

Allow creators/admins to add custom devices.

Requirements:

- GLB/GLTF
- Screen mesh configuration
- Default camera
- Device thumbnail
- Device metadata

---

# 39. Custom Fonts

## P2

Allow:

- Google Fonts
- Uploaded fonts for Pro users

Fonts should be loaded consistently during final rendering.

---

# 40. Audio

## P3

Support:

- Background music
- Sound effects
- Audio timeline
- Volume
- Fade in/out

Audio tracks:

```text
Music
────────────────────────

SFX
──────●────────●────────
```

---

# 41. Advanced Visual Effects

## P2

### Motion Blur

Useful for fast rotations and movement.

### Depth of Field

Creates cinematic camera focus.

### Bloom

Adds soft highlights.

### Reflection

Adds realistic product reflections.

### Ambient Occlusion

Improves depth and contact shadows.

### Film Grain

Adds cinematic texture.

---

# 42. Camera Animation

## P2

Animate:

- Position
- Rotation
- Zoom/FOV
- Focus distance

Example:

```text
Camera

00:00
Far

02:00
Medium

04:00
Close
```

This creates cinematic product shots.

---

# 43. Social Media Presets

## P1

One-click canvas presets:

```text
Instagram Post
1080 × 1080

Instagram Story
1080 × 1920

TikTok
1080 × 1920

YouTube
1920 × 1080

LinkedIn
1200 × 627
```

---

# 44. Brand Kit

## P3

Users can save:

- Brand colors
- Fonts
- Logos
- Backgrounds
- Reusable assets

Example:

```text
Brand Kit

Logo
Primary Color
Secondary Color
Font
```

---

# 45. Collaboration

## P3

Team features:

- Invite members
- Comments
- Project sharing
- Roles
- Viewer
- Editor
- Admin

---

# 46. Admin Panel

## P2

Admin can manage:

- Devices
- Templates
- Users
- Exports
- Storage usage
- Feature flags

---

# 47. Usage Limits

Free plan:

```text
Projects: Limited
Exports: Limited
Resolution: 720p
Watermark: Yes
```

Pro:

```text
Unlimited projects
1080p/4K
No watermark
Premium devices
Premium templates
```

---

# 48. Analytics

Track product events:

```text
project_created
device_added
asset_uploaded
keyframe_added
template_applied
export_started
export_completed
export_failed
```

Analytics should focus on product behavior and avoid collecting unnecessary personal information.

---

# 49. Feature Flags

Use feature flags for experimental functionality.

Example:

```ts
features = {
  videoExport: true,
  customDevices: false,
  motionBlur: false,
  collaboration: false
}
```

This makes gradual rollout easier.

---

# 50. Keyboard Shortcut System

Recommended shortcuts:

```text
Space       Play/Pause
Delete      Delete selected layer
Cmd/Ctrl+Z  Undo
Cmd/Ctrl+Y  Redo
Cmd/Ctrl+C  Copy
Cmd/Ctrl+V  Paste
Cmd/Ctrl+D  Duplicate
F           Fit canvas
0           Reset view
```

---

# 51. Accessibility

The editor should provide:

- Keyboard navigation
- Visible focus states
- Accessible labels
- Sufficient contrast
- Tooltips
- Reduced-motion option
- Screen-reader-friendly controls where practical

---

# 52. Mobile / Touch

## P2

Support:

- Pinch zoom
- Two-finger pan
- Touch timeline
- Touch object manipulation

Desktop remains the primary editor platform.

---

# 53. Notifications

Use non-intrusive notifications:

```text
Project saved
Export completed
Upload complete
Export failed
```

---

# 54. Empty States

Examples:

### No projects

```text
Create your first mockup

[New Project]
```

### No assets

```text
Upload an image or video

[Upload]
```

### No keyframes

```text
Add a keyframe to start animating.
```

---

# 55. Loading States

Use skeletons/spinners for:

- Device loading
- Asset loading
- Project loading
- Export status

Never leave the user staring at an empty canvas without feedback.

---

# 56. Feature Priority Roadmap

## Phase 1 — MVP

P0 features:

- Editor layout
- One iPhone
- Image upload
- Screen texture
- Canvas
- Position
- Scale
- Rotation
- Background
- Timeline
- Keyframes
- Playback
- Undo/redo
- Autosave
- PNG export

### MVP user journey

```text
Open app
 ↓
New project
 ↓
Choose iPhone
 ↓
Upload screenshot
 ↓
Place screenshot
 ↓
Animate device
 ↓
Preview
 ↓
Export PNG
```

---

# 57. Phase 2 — Video

Add:

- Video upload
- WebM export
- MP4 export
- Render queue
- Render progress
- Remotion
- FFmpeg

User journey:

```text
Create animation
 ↓
Export
 ↓
Choose MP4
 ↓
Render
 ↓
Download
```

---

# 58. Phase 3 — More Devices

Add:

- iPad
- MacBook
- Android
- Browser
- Watch

---

# 59. Phase 4 — Templates

Add:

- Animation presets
- Template gallery
- Template preview
- Apply template
- Custom templates

---

# 60. Phase 5 — Advanced Effects

Add:

- Motion blur
- Depth of field
- Bloom
- Reflection
- Cinematic lighting
- Camera animation

---

# 61. Phase 6 — SaaS

Add:

- Authentication
- Billing
- Free/Pro plans
- Export quotas
- Cloud project management
- Brand kits
- Share links

---

# 62. Phase 7 — Collaboration

Add:

- Team workspaces
- Project sharing
- Comments
- Roles
- Collaboration

---

# 63. Recommended MVP Feature Checklist

```text
[ ] Next.js application
[ ] Editor layout
[ ] Dark theme
[ ] Zustand state
[ ] Three.js/R3F canvas
[ ] One iPhone GLB
[ ] Device screen mesh
[ ] Image upload
[ ] Image texture
[ ] Position controls
[ ] Scale controls
[ ] Rotation controls
[ ] Background controls
[ ] Timeline
[ ] Play/pause
[ ] Scrubbing
[ ] Keyframes
[ ] Easing
[ ] Undo/redo
[ ] Autosave
[ ] Project JSON
[ ] Supabase database
[ ] PNG export
```

---

# 64. Post-MVP Checklist

```text
[ ] Video upload
[ ] WebM export
[ ] MP4 export
[ ] Remotion renderer
[ ] FFmpeg
[ ] Export queue
[ ] Export progress
[ ] More devices
[ ] Templates
[ ] Text layers
[ ] Multiple layers
[ ] Social presets
[ ] Advanced effects
[ ] Camera animation
[ ] Authentication
[ ] Billing
[ ] Share links
```

---

# 65. Product Success Criteria

The product should make this workflow feel extremely fast:

```text
Upload screenshot
        ↓
Choose device
        ↓
Looks good immediately
        ↓
Add 2–5 keyframes
        ↓
Preview
        ↓
Export
```

The user should not need to understand:

- Three.js
- 3D modeling
- UV mapping
- Animation mathematics
- FFmpeg
- Video codecs

The complexity should remain inside the product.

---

# 66. Final Feature Philosophy

The product should prioritize:

1. Beautiful defaults
2. Fast interaction
3. Simple controls
4. High-quality output
5. Reusable templates
6. Powerful keyframe animation
7. Extensible device support

The most important feature is not the number of controls.

It is the quality of this loop:

```text
Upload → Place → Animate → Preview → Export
```

If this loop is fast and visually impressive, the rest of the feature set can be added incrementally without changing the core product architecture.
