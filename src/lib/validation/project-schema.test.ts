import { describe, expect, it } from "vitest";

import { DEFAULT_DEVICE_ID } from "@/devices/registry";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { PROJECT_VERSION } from "@/types/project";

function clone<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("project serialization", () => {
  it("round-trips a freshly created project through JSON", () => {
    const project = createProject("Launch promo");
    const parsed = parseProject(clone(project));

    expect(parsed.ok).toBe(true);
    expect(parsed.project?.name).toBe("Launch promo");
    expect(parsed.project?.layers).toHaveLength(1);
    expect(parsed.project?.version).toBe(PROJECT_VERSION);
  });

  it("rejects structurally invalid data", () => {
    const parsed = parseProject({ version: 1, name: "broken" });
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBeTruthy();
  });

  it("rejects an unsupported future version", () => {
    const project = { ...createProject(), version: PROJECT_VERSION + 5 };
    const parsed = parseProject(clone(project));

    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Unsupported project version");
  });

  it("rejects an out-of-range opacity", () => {
    const project = createProject();
    project.layers[0].transform.opacity = 4;

    expect(parseProject(clone(project)).ok).toBe(false);
  });

  it("keeps keyframes through serialization", () => {
    const project = createProject();
    project.layers[0].animations = [
      {
        property: "rotationY",
        keyframes: [
          { id: "kf_1", time: 0, value: 0, easing: "linear" },
          { id: "kf_2", time: 2, value: 360, easing: "easeInOut" },
        ],
      },
    ];

    const parsed = parseProject(clone(project));
    expect(parsed.ok).toBe(true);
    expect(parsed.project?.layers[0].animations[0].keyframes).toHaveLength(2);
  });

  it("accepts both background kinds", () => {
    const solid = createProject();
    expect(parseProject(clone(solid)).ok).toBe(true);

    const transparent = { ...createProject(), background: { type: "transparent" as const } };
    expect(parseProject(clone(transparent)).ok).toBe(true);
  });

  it("migrates a project saved against the pre-model device id", () => {
    const project = createProject();
    const raw = clone(project) as ReturnType<typeof createProject>;
    raw.layers[0].metadata = { ...raw.layers[0].metadata, deviceId: "iphone" };

    const parsed = parseProject(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.project?.layers[0].metadata?.deviceId).toBe(DEFAULT_DEVICE_ID);
  });

  it("fills in screen and finish settings a pre-model project never had", () => {
    const raw = clone(createProject()) as ReturnType<typeof createProject>;
    const metadata: Record<string, unknown> = { ...raw.layers[0].metadata };
    delete metadata.screenContrast;
    delete metadata.screenSaturation;
    delete metadata.deviceAppearance;
    // How a v1 project stored the finish.
    metadata.bodyFinish = "dark";
    metadata.bodyColor = "#123456";
    raw.layers[0].metadata = metadata;

    const parsed = parseProject(raw);
    expect(parsed.project?.layers[0].metadata).toMatchObject({
      screenContrast: 1,
      screenSaturation: 1,
      deviceAppearance: { finish: "dark", bodyColor: "#123456" },
    });
  });
});