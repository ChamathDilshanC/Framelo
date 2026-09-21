import { idb } from "@/lib/storage/idb";
import { parseProject } from "@/lib/validation/project-schema";
import type { Asset } from "@/types/asset";
import type { Project, ProjectSummary } from "@/types/project";

/**
 * Local project persistence.
 *
 * Two tiers on purpose:
 *
 *   * the **summary index** lives in `localStorage`, because the dashboard has
 *     to paint a list on the first synchronous frame, before any async store
 *     has opened;
 *   * the **project bodies** live in IndexedDB, which has room for real
 *     keyframe data and is the durable copy an offline session recovers from.
 *
 * This is the bottom of the stack: it never talks to the network. The sync
 * layer above decides whether a save also goes to the cloud, so the editor
 * behaves identically signed in or out.
 */

const INDEX_KEY = "framelo:projects";
const ASSET_INDEX_KEY = "framelo:assets";
const BODY_PREFIX = "project:";
/** Pre-IndexedDB location, still read once so existing work is not stranded. */
const LEGACY_BODY_PREFIX = "framelo:project:";

export interface ProjectStorage {
  list(): Promise<ProjectSummary[]>;
  load(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  listAssets(): Promise<Asset[]>;
  saveAssets(assets: Asset[]): Promise<void>;
  /** Synchronous read of the cached index, for a first paint with no await. */
  cachedSummaries(): ProjectSummary[];
  /** Merge cloud metadata into the local index without touching the bodies. */
  mergeSummaries(summaries: ProjectSummary[]): ProjectSummary[];
  /** Drop index entries that belong to an account rather than this device. */
  forgetCloudOnlyProjects(): Promise<ProjectSummary[]>;
}

export class StorageUnavailableError extends Error {
  constructor() {
    super("Local storage is unavailable in this browser");
    this.name = "StorageUnavailableError";
  }
}

function getStore(): Storage {
  if (typeof window === "undefined" || !window.localStorage) throw new StorageUnavailableError();
  return window.localStorage;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = getStore().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  getStore().setItem(key, JSON.stringify(value));
}

function toSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    origin: "local",
  };
}

class LocalProjectStorage implements ProjectStorage {
  cachedSummaries(): ProjectSummary[] {
    const summaries = readJson<ProjectSummary[]>(INDEX_KEY) ?? [];
    return summaries
      .map((entry) => ({ ...entry, origin: entry.origin ?? "local" }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async list(): Promise<ProjectSummary[]> {
    return this.cachedSummaries();
  }

  async load(id: string): Promise<Project | null> {
    let raw = await idb.get<unknown>(BODY_PREFIX + id);

    if (raw === undefined) {
      // One-time migration from the localStorage-only era.
      const legacy = getStore().getItem(LEGACY_BODY_PREFIX + id);
      raw = legacy ? JSON.parse(legacy) : undefined;
      if (raw !== undefined) {
        await idb.set(BODY_PREFIX + id, raw);
        try {
          getStore().removeItem(LEGACY_BODY_PREFIX + id);
        } catch {
          /* the copy in IndexedDB is what matters */
        }
      }
    }

    if (raw === undefined || raw === null) return null;

    const result = parseProject(raw);
    if (!result.ok || !result.project) {
      throw new Error(result.error ?? "This project could not be read");
    }
    return result.project;
  }

  async save(project: Project): Promise<void> {
    await idb.set(BODY_PREFIX + project.id, project);

    const summaries = this.cachedSummaries().filter((entry) => entry.id !== project.id);
    const previous = this.cachedSummaries().find((entry) => entry.id === project.id);

    // Cloud-only fields (thumbnail, share state) are set by the sync layer and
    // must survive a local save.
    summaries.push({ ...toSummary(project), ...pickCloudFields(previous) });
    writeJson(INDEX_KEY, summaries);
  }

  async remove(id: string): Promise<void> {
    await idb.delete(BODY_PREFIX + id).catch(() => {});
    try {
      getStore().removeItem(LEGACY_BODY_PREFIX + id);
    } catch {
      /* nothing to clean up */
    }
    writeJson(
      INDEX_KEY,
      this.cachedSummaries().filter((entry) => entry.id !== id),
    );
  }

  mergeSummaries(remote: ProjectSummary[]): ProjectSummary[] {
    const byId = new Map(this.cachedSummaries().map((entry) => [entry.id, entry]));

    for (const entry of remote) {
      const local = byId.get(entry.id);
      // A local copy edited more recently than the server's is the one the user
      // is looking at; the remote row only contributes its cloud-side fields.
      if (local && local.updatedAt > entry.updatedAt) {
        byId.set(entry.id, { ...local, ...pickCloudFields(entry), origin: "cloud" });
      } else {
        byId.set(entry.id, entry);
      }
    }

    const merged = [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    writeJson(INDEX_KEY, merged);
    return merged;
  }

  /**
   * Forget projects that were only ever someone's cloud rows.
   *
   * `mergeSummaries` writes cloud metadata into the same local index that
   * holds guest work, which is what makes the dashboard paint instantly. The
   * cost is that signing out used to leave the previous account's project
   * names on screen — unopenable, because their bodies live on the server.
   *
   * The test is whether the device actually has the project, not where it came
   * from. Anything with a local body stays: that is work the user can open
   * offline, and Framelo promises it survives signing out. Anything that is
   * metadata alone goes.
   */
  async forgetCloudOnlyProjects(): Promise<ProjectSummary[]> {
    const summaries = this.cachedSummaries();

    const kept: ProjectSummary[] = [];
    for (const summary of summaries) {
      const body = await idb.get<unknown>(BODY_PREFIX + summary.id).catch(() => undefined);
      if (body === undefined) continue;
      // It is this device's copy now; the cloud fields no longer apply.
      kept.push({ ...summary, origin: "local", thumbnailUrl: null, isPublic: false, isPortfolio: false });
    }

    writeJson(INDEX_KEY, kept);
    return kept;
  }

  async listAssets(): Promise<Asset[]> {
    const stored = await idb.get<Asset[]>(ASSET_INDEX_KEY);
    if (stored) return stored;
    const legacy = getStore().getItem(ASSET_INDEX_KEY);
    const assets: Asset[] = legacy ? JSON.parse(legacy) : [];
    if (assets.length) await idb.set(ASSET_INDEX_KEY, assets);
    return assets;
  }

  async saveAssets(assets: Asset[]): Promise<void> {
    await idb.set(ASSET_INDEX_KEY, assets);
  }
}

function pickCloudFields(summary: ProjectSummary | undefined) {
  if (!summary) return {};
  return {
    thumbnailUrl: summary.thumbnailUrl,
    isPublic: summary.isPublic,
    isPortfolio: summary.isPortfolio,
  };
}

export const projectStorage: ProjectStorage = new LocalProjectStorage();
