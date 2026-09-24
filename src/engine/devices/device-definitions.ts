import type { DeviceDefinition, DeviceFinish, DeviceFinishId } from "@/types/device";

/**
 * Photorealistic device definitions.
 *
 * Devices are data, not code paths: a device is a GLB plus the handful of
 * corrections that GLB needs (base orientation, screen UV mapping, a few
 * material overrides). Adding one means adding an entry here — no renderer,
 * canvas or store change.
 *
 * The orientation, screen-material names and UV corrections below were derived
 * from Phone Mockup Studio (MIT, Quentin PLA), which is also where the GLBs
 * come from. The models themselves are CC BY 4.0 third-party assets — see
 * `public/devices/CREDITS.md`.
 *
 * Scene units are roughly "decimetres": every device is normalised to 3 units
 * tall so one camera framing works across the library and the procedural
 * fallback lines up with the modelled version.
 */

const NORMALIZE_HEIGHT = 3;

/** Shared procedural-fallback proportions, scaled per device by `fallbackBody`. */
function fallbackBody(width: number, height: number) {
  return {
    body: {
      width,
      height,
      depth: 0.17,
      cornerRadius: width * 0.176,
      bezel: 0.052,
    },
    screen: {
      width: width * 0.93,
      height: height * 0.965,
      cornerRadius: width * 0.142,
      position: [0, 0, 0.088] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    },
  };
}

const IPHONE_15_PRO_MAX_FALLBACK = fallbackBody(1.48, 3.02);
const IPHONE_17_PRO_MAX_FALLBACK = fallbackBody(1.5, 3.02);
const IPHONE_17_PRO_FALLBACK = fallbackBody(1.45, 3.02);
const IPHONE_DUO_FALLBACK = fallbackBody(1.48, 3.02);
const IPHONE_18_PRO_MAX_FALLBACK = fallbackBody(1.46, 3.02);
const IPHONE_13_PRO_MAX_FALLBACK = fallbackBody(1.48, 3.02);

/** Flat, unlit deep black — for bezels and Dynamic Island pills that would
 * otherwise catch the light rig and render as reflective grey. */
const FLAT_BLACK = {
  color: 0x000000,
  emissive: 0x0d0d0f,
  emissiveIntensity: 1,
  metalness: 0,
  roughness: 1,
  envMapIntensity: 0,
  toneMapped: false,
  keepFinish: true,
} as const;

/** Cover glass that would otherwise drop a mirror highlight over the screen. */
const DE_REFLECTED_GLASS = {
  roughness: 1,
  metalness: 0,
  envMapIntensity: 0,
  transparent: true,
  opacity: 0.03,
  keepFinish: true,
} as const;

export const IPHONE_15_PRO_MAX: DeviceDefinition = {
  id: "iphone-15-pro-max",
  name: "iPhone 15 Pro Max",
  category: "phone",
  description: '6.7" titanium flagship with a Dynamic Island.',
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_15_PRO_MAX_FALLBACK,
  screenAspect: 1290 / 2796,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    dynamicIsland: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-15-pro-max.glb",
    screenMeshNames: ["xXDHkMplTIDAXLN"],
    screenMaterialNames: ["pIJKfZsazmcpEiU"],
    rotation: [0, Math.PI, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1290, 2796],
    uv: { rotation: Math.PI, mirrorX: true },
    // This model's materials are hashed names, so nothing can be classified by
    // reading them; the body is the default role and the parts that must not be
    // recoloured are named here.
    roles: {
      ZQfGMLaFcpPaLMU: "glass",
      dwrMminMXjXXeek: "logo",
      hiVunnLeAHkwGEo: "lens",
    },
    tweaks: {
      // The back Apple logo: flat and unlit, so it can never band or streak.
      dwrMminMXjXXeek: {
        color: 0x000000,
        emissive: 0x1c1c20,
        emissiveIntensity: 1,
        metalness: 0,
        roughness: 1,
        envMapIntensity: 0,
        toneMapped: false,
        keepFinish: true,
        polygonOffset: true,
        polygonOffsetFactor: -12,
        polygonOffsetUnits: -12,
      },
    },
  },
};

export const IPHONE_17_PRO_MAX: DeviceDefinition = {
  id: "iphone-17-pro-max",
  name: "iPhone 17 Pro Max",
  category: "phone",
  description: '6.9" aluminium unibody with the widest Pro display.',
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_17_PRO_MAX_FALLBACK,
  screenAspect: 1320 / 2868,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    dynamicIsland: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-17-pro-max.glb",
    screenMeshNames: ["Cube.010_screen.001_0"],
    screenMaterialNames: ["screen.001"],
    rotation: [0, Math.PI / 2, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1320, 2868],
    // The visible face of this screen mesh samples u -0.9528..0.0197 and
    // v 0.0019..1.0019 (the other face sits inside the body). Remap that
    // window onto the full canvas; the negative scale is the 180° flip.
    uv: { repeat: [-1.028278, -1], offset: [0.020257, 1.0019] },
    // This GLB has no modelled bezel — the display runs edge to edge — so the
    // shader draws one, framing the screenshot like the other models.
    inset: { border: 26, radius: 162 },
    roles: {
      "glass.002": "glass",
      "black.002": "glass",
      lensinglass: "lens",
      "Material.007": "lens",
      logo_face: "logo",
      "gray.001": "sensor",
    },
    tweaks: {
      // Only the Dynamic Island pill of this surround is visible; the rest is
      // hidden behind the glass. Lit, it renders light grey.
      "black.002": { ...FLAT_BLACK, emissive: 0x000000 },
      "glass.002": DE_REFLECTED_GLASS,
    },
  },
};

export const IPHONE_17_PRO: DeviceDefinition = {
  id: "iphone-17-pro",
  name: "iPhone 17 Pro",
  category: "phone",
  description: '6.3" Pro body — the compact hero shot.',
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_17_PRO_FALLBACK,
  screenAspect: 1206 / 2622,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    dynamicIsland: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-17-pro.glb",
    screenMeshNames: ["Object_18", "Object_23"],
    screenMaterialNames: ["OLED"],
    rotation: [0, Math.PI, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1206, 2622],
    uv: { mirrorX: true },
    roles: {
      Glass: "glass",
      Display_Frame: "glass",
      OLED_off: "glass",
      // "Glass_tint" and "Frosted_glass" are the two laminated layers of the
      // back panel, not protective cover glass. Their names match the glass
      // classifier, so both were protected from finishes — and since the tint
      // layer is white and sits on top, it washed out everything beneath it.
      // Probing the render one material at a time is what identified them:
      // with the panel forced to pure red, these were the only two materials
      // that changed the pixels in the middle of the back.
      Glass_tint: "body",
      Frosted_glass: "body",
      // Antenna bands sit in the rail and are the rail's colour on real
      // hardware; leaving them out made a gold phone keep silver stripes.
      Plastic_antena: "frame",
      Camera_sapphire_miror: "lens",
      Camera_mirror_filter: "lens",
      Camera_filter: "lens",
      Camera_Lens: "lens",
      Plastic_LED: "sensor",
      Plastic_port: "sensor",
      // The warm flash lens. A gold finish must not tint it.
      material: "sensor",
      Metal_mesh: "sensor",
      Metal_Screw: "sensor",
    },
    tweaks: {
      // A 25% black film with mirror roughness: it greys the screenshot out and
      // catches a large specular blob.
      Glass: DE_REFLECTED_GLASS,
      Display_Frame: FLAT_BLACK,
      OLED_off: FLAT_BLACK,
    },
  },
};

export const IPHONE_DUO: DeviceDefinition = {
  id: "iphone-duo",
  name: "iPhone Duo",
  category: "phone",
  description: "Dual iPhone presentation with two independently modelled displays.",
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_DUO_FALLBACK,
  screenAspect: 1290 / 2796,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    dynamicIsland: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-duo.glb",
    screenMeshNames: ["Cube.053", "Cube.011"],
    screenMaterialNames: ["Screen.002", "Screen.001"],
    rotation: [0, Math.PI, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1290, 2796],
    uv: { mirrorX: true },
    roles: {
      "Glass screen": "glass",
      "Glass сamera": "glass",
      "Camera frame": "frame",
      "Camera ": "lens",
      Flash: "sensor",
    },
  },
};

export const IPHONE_18_PRO_MAX: DeviceDefinition = {
  id: "iphone-18-pro-max",
  name: "iPhone 18 Pro Max",
  category: "phone",
  description: "High-quality iPhone 18 Pro Max model with an editable display.",
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_18_PRO_MAX_FALLBACK,
  screenAspect: 1320 / 2868,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    dynamicIsland: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-18-pro-max.glb",
    screenMeshNames: [],
    screenMaterialNames: ["Material.001"],
    rotation: [0, Math.PI, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1320, 2868],
    roles: {
      "17ProMax_glass": "glass",
      "17ProMax_Black2": "glass",
      "17ProMax_black1": "glass",
      "17ProMax_Lens": "lens",
      "17ProMax_Lens2.001": "lens",
      "17ProMax_Logo": "logo",
      "Material.002": "sensor",
      R: "sensor",
    },
    inset: { border: 0, radius: 0 },
  },
};

export const IPHONE_13_PRO_MAX: DeviceDefinition = {
  id: "iphone-13-pro-max",
  name: "iPhone 13 Pro Max",
  category: "phone",
  description: "iPhone 13 Pro Max model with an editable display.",
  ratioLabel: "19.5 : 9",
  available: true,
  ...IPHONE_13_PRO_MAX_FALLBACK,
  screenAspect: 1284 / 2778,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    notch: true,
    homeIndicator: true,
    sideButtons: true,
    cameraBump: true,
  },
  model: {
    path: "/devices/iphone-13-pro-max.glb",
    screenMeshNames: ["Body.001_Screen Glass_0"],
    screenMaterialNames: ["Screen_Glass"],
    rotation: [0, 0, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1284, 2778],
    roles: {
      Bezel: "glass",
      Screen_Glass: "glass",
      Camera_Glass: "glass",
      Lens: "lens",
      Camera_Frame: "frame",
      "Camera_Frame.001": "frame",
      Logo: "logo",
      Flash: "sensor",
      material: "sensor",
      Port: "sensor",
    },
    inset: { border: 0, radius: 0 },
  },
};

export const MACBOOK_NEO: DeviceDefinition = {
  id: "macbook-neo-2026",
  name: "MacBook Neo",
  category: "laptop",
  description: "MacBook Neo 2026 with an editable display and anodised aluminium body.",
  ratioLabel: "16 : 10",
  available: true,
  body: { width: 4.48, height: 3, depth: 2.95, cornerRadius: 0.08, bezel: 0.1 },
  screen: {
    width: 4.24,
    height: 2.65,
    cornerRadius: 0.05,
    position: [0, 0.08, -1.44],
    rotation: [0, 0, 0],
  },
  screenAspect: 16 / 10,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  model: {
    path: "/devices/macbook-neo-2026.glb",
    screenMeshNames: ["Object_4"],
    screenMaterialNames: ["Glass_-_Heavy_Color"],
    rotation: [0, 0, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [2560, 1600],
    inset: { border: 0, radius: 0 },
    roles: {
      "Glass_-_Heavy_Color": "screen",
      "Aluminum_-_Anodized_Rough_Grey": "body",
      "Aluminum_-_Brushed_Linear": "frame",
      "Aluminum_-_Polished": "frame",
      "Nickel_-_Satin": "button",
      "Plastic_-_Translucent_Matte_Yellow": "sensor",
      "Steel_-_Satin": "frame",
    },
  },
};

export const IMAC_2021: DeviceDefinition = {
  id: "imac-2021",
  name: "iMac 2021",
  category: "laptop",
  description: "24-inch iMac 2021 with a bright studio display and aluminium stand.",
  ratioLabel: "16 : 9",
  available: true,
  body: { width: 4.8, height: 2.8, depth: 0.28, cornerRadius: 0.08, bezel: 0.08 },
  screen: {
    width: 4.1,
    height: 2.3,
    cornerRadius: 0.06,
    position: [0, 0.16, 0.14],
    rotation: [0, 0, 0],
  },
  screenAspect: 16 / 9,
  defaultCamera: { position: [0, 0.2, 7.2], target: [0, 0, 0], fov: 30 },
  model: {
    path: "/devices/imac_2021.glb",
    screenMeshNames: ["Screen"],
    screenMaterialNames: ["Screen"],
    rotation: [0, 0, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [4480, 2520],
    inset: { border: 0, radius: 0 },
    roles: {
      LightBlue: "body",
      Metal: "frame",
      Metal2: "frame",
      DarkBlue: "body",
      Black: "sensor",
      White: "body",
      Screen: "screen",
      Chrome: "frame",
      "Cam.Black": "sensor",
      Lens: "lens",
      Glass: "glass",
      "Black.001": "sensor",
      Yellow: "sensor",
    },
  },
};

export const SAMSUNG_GALAXY_S22_ULTRA: DeviceDefinition = {
  id: "samsung-galaxy-s22-ultra",
  name: "Samsung Galaxy S22 Ultra",
  category: "phone",
  description: "Android flagship with S Pen support and a dual-curve AMOLED display.",
  ratioLabel: "19.3 : 9",
  available: true,
  body: { width: 1.58, height: 3.26, depth: 0.17, cornerRadius: 0.18, bezel: 0.06 },
  screen: {
    width: 1.46,
    height: 3.08,
    cornerRadius: 0.16,
    position: [0, 0, 0.09],
    rotation: [0, 0, 0],
  },
  screenAspect: 1440 / 3088,
  defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  features: {
    cameraBump: true,
    homeIndicator: true,
    sideButtons: true,
  },
  model: {
    path: "/devices/samsung_galaxy_s22_ultra.glb",
    screenMeshNames: ["Object_12"],
    screenMaterialNames: ["Display_ActiveArea"],
    rotation: [0, Math.PI, 0],
    normalizeHeight: NORMALIZE_HEIGHT,
    screenPixels: [1440, 3088],
    inset: { border: 0, radius: 0 },
    roles: {
      Antenna_Plastic: "sensor",
      BackCamDeco: "sensor",
      BackCover_Glass_hole: "glass",
      Back_Cover_Glass: "glass",
      Bezel: "glass",
      Black_hole: "sensor",
      Cam_Bezel: "frame",
      Cam_Body: "sensor",
      Cam_Glass: "glass",
      Cam_lens: "lens",
      Display_ActiveArea: "screen",
      Flash: "sensor",
      Flash_Glass: "glass",
      Gray: "sensor",
      Pen_Ball: "button",
      Pen_Body: "button",
      Pen_Button: "button",
      Pen_Top: "button",
      Rearcase: "body",
      Rearcase_hole: "body",
      material: "sensor",
      SAMSUNG_LOGO: "logo",
      Sensor: "sensor",
      SpeakerMic: "sensor",
      Usb_1: "sensor",
      Usb_2: "sensor",
      Zoom_Cam: "sensor",
    },
  },
};

/** Original studio models with dedicated, top-left UV display surfaces. */
export const IPAD: DeviceDefinition = {
  id: "ipad", name: "iPad", category: "tablet", available: true,
  description: "Portrait aluminium tablet with an independently editable display.", ratioLabel: "11-inch",
  body: { width: 2.16, height: 3, depth: 0.069, cornerRadius: 0.13, bezel: 0.1 },
  screen: { width: 2.8 * 1668 / 2388, height: 2.8, cornerRadius: 0.095, position: [0, 0, 0.054], rotation: [0, 0, 0] },
  screenAspect: 1668 / 2388, defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  model: { path: "/devices/ipad.glb", screenMeshNames: ["Screen"], screenMaterialNames: ["Display"],
    rotation: [0, 0, 0], normalizeHeight: 3, screenPixels: [1668, 2388],
    roles: { Bezel: "glass", Keyboard: "sensor", Lens: "lens", Legend: "sensor" }, inset: { border: 0, radius: 0 } },
};
export const MACBOOK: DeviceDefinition = {
  id: "macbook", name: "MacBook Pro 2020", category: "laptop", available: true,
  description: "MacBook Pro 2020 with a textured keyboard, Touch Bar, trackpad and editable display.", ratioLabel: "16 : 10",
  body: { width: 4.323, height: 3, depth: 2.954, cornerRadius: 0.06, bezel: 0.1 },
  screen: { width: 4.01, height: 2.506, cornerRadius: 0, position: [0, 0.085, -1.435], rotation: [0, 0, 0] },
  screenAspect: 16 / 10, defaultCamera: { position: [0, 0.1, 7.6], target: [0, 0, 0], fov: 32 },
  model: { path: "/devices/macbook-pro-2020.glb", screenMeshNames: ["Screen"], screenMaterialNames: ["Display"],
    rotation: [0, 0, 0], normalizeHeight: 3, screenPixels: [2560, 1600],
    roles: { Bezel: "glass", Keyboard: "sensor", TouchBar: "sensor", Rubber: "sensor", Logo: "sensor", Lens: "lens", Legend: "sensor" },
    inset: { border: 0, radius: 0 } },
};

/** Devices that ship with a photorealistic GLB, in library order. */
export const MODELLED_DEVICES: DeviceDefinition[] = [
  IPHONE_15_PRO_MAX,
  IPHONE_17_PRO_MAX,
  IPHONE_17_PRO,
  IPHONE_DUO,
  IPHONE_18_PRO_MAX,
  IPHONE_13_PRO_MAX,
  IPAD,
  MACBOOK,
  MACBOOK_NEO,
  IMAC_2021,
  SAMSUNG_GALAXY_S22_ULTRA,
];


/**
 * Body finishes.
 *
 * `mix` is how hard a material is pulled towards `tint`; the controller scales
 * it again per material so near-black parts lift further than bright ones.
 * "Custom" carries no colour of its own — it reads `deviceAppearance.bodyColor`.
 */
export const DEVICE_FINISHES: DeviceFinish[] = [
  {
    id: "natural",
    label: "Natural",
    tint: "#b6b1a8",
    // Natural keeps the model's own colour, only lifting it out of near-black
    // so it reads as brushed titanium rather than a silhouette.
    mix: 0.34,
    roughness: 1,
    metalness: 1,
    adaptive: true,
  },
  // The explicit finishes sit high on purpose. `mix` is how much of the finish
  // replaces the model's own colour, and the remainder is not neutral — these
  // GLBs ship in saturated colours, so the iPhone 17 Pro Max's cosmic orange
  // stayed visible as a brown cast on "Dark" and a peach cast on "Silver"
  // until the weights went up. What is left is enough for the model's shading
  // and material variation to survive, and `shadeParts` still separates the
  // rail and buttons from the panel.
  {
    id: "dark",
    label: "Dark",
    tint: "#34353a",
    mix: 0.93,
    roughness: 1.12,
    metalness: 0.95,
    shadeParts: true,
  },
  {
    id: "light",
    label: "Light",
    tint: "#dcdde1",
    mix: 0.92,
    roughness: 0.9,
    metalness: 1,
    shadeParts: true,
  },
  {
    id: "gold",
    label: "Gold",
    tint: "#d8b46a",
    mix: 0.9,
    roughness: 0.86,
    metalness: 1,
    shadeParts: true,
  },
  {
    id: "silver",
    label: "Silver",
    tint: "#c9ccd2",
    mix: 0.92,
    roughness: 0.8,
    metalness: 1,
    shadeParts: true,
  },
  /*
   * Black and White sit beside Dark and Light rather than replacing them, and
   * the difference is real: Dark and Light are *anodised* finishes — the tint
   * is a shade of grey with a hint of the model's own colour left in it, and
   * `shadeParts` separates the rail from the panel the way real hardware does.
   * Black and White are painted: one colour, all the way across, no part
   * shading, and a near-total mix so nothing of the GLB's own paint survives.
   *
   * They still go through the same PBR path as every other finish. Nothing here
   * touches the screen, the camera glass, the lenses or the sensors, so a white
   * phone keeps its black display and its clear lenses, and the reflections and
   * highlights are the renderer's, not a filter's.
   */
  {
    id: "black",
    label: "Black",
    // Not #000. A pure black body has no shading information left in it at all
    // and reads as a hole in the image rather than as an object.
    tint: "#16171a",
    mix: 0.97,
    roughness: 1.2,
    metalness: 0.55,
  },
  {
    id: "white",
    label: "White",
    // Likewise not #fff: a ceramic white keeps enough tone for the highlight
    // roll-off to be visible along the rail.
    tint: "#eceded",
    mix: 0.96,
    roughness: 0.72,
    metalness: 0.35,
  },
  {
    id: "blue",
    label: "Blue",
    tint: "#3f5aa6",
    mix: 0.94,
    roughness: 0.88,
    metalness: 1,
    shadeParts: true,
  },
  {
    id: "custom",
    label: "Custom",
    tint: "#b6b1a8",
    mix: 0.95,
    roughness: 0.9,
    metalness: 1,
    shadeParts: true,
    custom: true,
  },
];

export const DEFAULT_FINISH_ID: DeviceFinishId = "natural";

/** Finishes a device offers, in library order. */
export function finishesFor(device: { finishes?: DeviceFinishId[] }): DeviceFinish[] {
  if (!device.finishes) return DEVICE_FINISHES;
  const allowed = new Set(device.finishes);
  return DEVICE_FINISHES.filter((finish) => allowed.has(finish.id));
}

export function getFinish(id: string | undefined): DeviceFinish {
  return DEVICE_FINISHES.find((finish) => finish.id === id) ?? DEVICE_FINISHES[0];
}
