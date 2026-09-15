"use client";

import { createId } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import { projectStorage } from "@/lib/storage/project-storage";
import { getSupabaseClient } from "@/lib/supabase/client";
import { PROJECT_SUMMARY_COLUMNS, STORAGE_BUCKETS, type ProjectRow, type ProjectSummaryRow } from "@/lib/supabase/types";
import { parseProject } from "@/lib/validation/project-schema";
import { useAuthStore } from "@/store/auth-store";
import type { Project, ProjectSummary } from "@/types/project";

/**
 * The project repository.
 *
 * Local-first, in the strict sense: every read is answered from the browser
 * first and every write lands locally before anything touches the network. The
 * cloud is a replica, not the source of truth — which is what keeps the editor
 * responsive, keeps it working offline, and keeps a failed request from ever
 * losing work.
 *
 * Nothing here runs during playback or on a timeline tick. Saves arrive from
 * the debounced autosave hook; lists are fetched once per dashboard visit.
 */

export interface ListOptions {
  limit?: number;
  /** Zero-based page. The dashboard pages rather than fetching everything. */
  page?: number;
}

const DEFAULT_PAGE_SIZE = 24;

function cloud() {
  const supabase = getSupabaseClient();
  const userId = useAuthStore.getState().user?.id ?? null;
  return supabase && userId ? { supabase, userId } : null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Synchronous, for a dashboard that paints before any request resolves. */
export function cachedProjects(): ProjectSummary[] {
  return projectStorage.cachedSummaries();
}

export async function listProjects(options: ListOptions = {}): Promise<ProjectSummary[]> {
  const local = await projectStorage.list();

  const session = cloud();
  if (!session) return local;

  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const from = (options.page ?? 0) * limit;

  // Never `select("*")`: a page of twenty projects would otherwise pull every
  // keyframe in each of them to render a grid of names and thumbnails.
  const { data, error } = await session.supabase
    .from("projects")
    .select(PROJECT_SUMMARY_COLUMNS)
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error || !data) return local;

  const remote = (data as unknown as ProjectSummaryRow[]).map((row) => summaryFromRow(row, session.supabase));
  return projectStorage.mergeSummaries(remote);
}

export async function loadProject(id: string): Promise<Project | null> {
  const local = await projectStorage.load(id).catch(() => null);

  const session = cloud();
  if (!session) return local;

  const { data } = await session.supabase
    .from("projects")
    .select("id,project_data,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) return local;

  const row = data as Pick<ProjectRow, "id" | "project_data" | "updated_at">;

  // A local copy edited more recently than the server's is the newer one — a
  // stale row must never overwrite work the user can still see.
  if (local && local.updatedAt >= row.updated_at) return local;

  const parsed = parseProject(row.project_data);
  if (!parsed.ok || !parsed.project) return local;

  await projectStorage.save(parsed.project).catch(() => {});
  return parsed.project;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface SaveResult {
  /** The local write succeeded. The user's work is safe either way. */
  saved: boolean;
  /** The cloud write succeeded, or there was no cloud to write to. */
  synced: boolean;
  error?: string;
}

/**
 * Persist a project.
 *
 * The local write is awaited and reported first, so the UI can say "Saved" the
 * moment the work is durable. The cloud write is attempted straight after and
 * reported separately: if it fails, the draft is still safe and the sync queue
 * retries it.
 */
export async function saveProject(project: Project): Promise<SaveResult> {
  await projectStorage.save(project);

  const session = cloud();
  if (!session) return { saved: true, synced: true };

  const { error } = await session.supabase.from("projects").upsert(
    {
      id: toUuid(project.id),
      user_id: session.userId,
      name: project.name,
      slug: project.slug,
      description: project.description ?? null,
      project_data: project,
      updated_at: project.updatedAt,
    },
    { onConflict: "id" },
  );

  if (error) {
    enqueue(project.id);
    return { saved: true, synced: false, error: error.message };
  }

  dequeue(project.id);
  return { saved: true, synced: true };
}

export async function createProjectRecord(project: Project): Promise<Project> {
  await saveProject(project);
  return project;
}

export async function renameProject(project: Project, name: string): Promise<void> {
  await saveProject({ ...project, name, updatedAt: new Date().toISOString() });
}

export async function deleteProject(id: string): Promise<void> {
  await projectStorage.remove(id);

  const session = cloud();
  if (!session) return;

  // The cascade on `projects` removes assets, shares and the portfolio item.
  await session.supabase.from("projects").delete().eq("id", id).eq("user_id", session.userId);
}

/**
 * Duplicate a project.
 *
 * A fresh id and slug, the same document. The original is read and never
 * written, so a duplicate can never disturb what it was copied from.
 */
export async function duplicateProject(id: string): Promise<Project | null> {
  const source = await loadProject(id);
  if (!source) return null;

  const now = new Date().toISOString();
  const name = `${source.name} copy`;

  const copy: Project = {
    ...source,
    id: createId("proj"),
    name,
    slug: uniqueSlug(name),
    createdAt: now,
    updatedAt: now,
    // Fresh keyframe ids keep the two projects' history independent.
    layers: source.layers.map((layer) => ({
      ...layer,
      id: createId("layer"),
      transform: { ...layer.transform },
      metadata: { ...layer.metadata },
      animations: layer.animations.map((track) => ({
        property: track.property,
        keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, id: createId("kf") })),
      })),
    })),
  };

  await saveProject(copy);
  return copy;
}

// ---------------------------------------------------------------------------
// Thumbnails
// ---------------------------------------------------------------------------

/**
 * Store a project's poster image.
 *
 * Uploaded with `upsert`, so a project keeps one thumbnail path for its whole
 * life and every cached copy of that URL is replaced rather than accumulating.
 */
export async function saveThumbnail(projectId: string, blob: Blob): Promise<string | null> {
  const session = cloud();
  if (!session) {
    // Guest mode: keep the poster in IndexedDB so the dashboard still has one.
    await import("@/lib/storage/idb").then(({ idb }) => idb.set(`thumb:${projectId}`, blob));
    return null;
  }

  const path = `${session.userId}/${projectId}/thumbnail.webp`;

  const { error } = await session.supabase.storage
    .from(STORAGE_BUCKETS.thumbnails)
    .upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: "3600" });

  if (error) return null;

  await session.supabase
    .from("projects")
    .update({ thumbnail_path: path })
    .eq("id", projectId)
    .eq("user_id", session.userId);

  return path;
}

/** Locally cached poster for a guest project. */
export async function localThumbnailUrl(projectId: string): Promise<string | null> {
  const { idb } = await import("@/lib/storage/idb");
  const blob = await idb.get<Blob>(`thumb:${projectId}`).catch(() => undefined);
  return blob ? URL.createObjectURL(blob) : null;
}

export function thumbnailUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return supabase.storage.from(STORAGE_BUCKETS.thumbnails).getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Offline retry queue
// ---------------------------------------------------------------------------

const QUEUE_KEY = "framelo:sync-queue";

function readQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeQueue(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* a full store must not break saving */
  }
}

function enqueue(id: string): void {
  writeQueue([...readQueue(), id]);
}

function dequeue(id: string): void {
  writeQueue(readQueue().filter((entry) => entry !== id));
}

export function pendingSyncCount(): number {
  return readQueue().length;
}

/**
 * Push everything that failed to sync.
 *
 * Called when the connection returns and when the user signs in. Each project
 * is re-read from local storage first, so the queue always pushes the newest
 * version rather than whatever failed at the time.
 */
export async function flushSyncQueue(): Promise<number> {
  const ids = readQueue();
  if (ids.length === 0 || !cloud()) return 0;

  let pushed = 0;
  for (const id of ids) {
    const project = await projectStorage.load(id).catch(() => null);
    if (!project) {
      dequeue(id);
      continue;
    }
    const result = await saveProject(project);
    if (result.synced) pushed += 1;
  }
  return pushed;
}

/**
 * Upload guest projects after a sign-in.
 *
 * Everything made before signing in belongs to the account that just appeared;
 * losing it at the sign-in boundary is the single worst thing a local-first app
 * can do.
 */
export async function syncLocalProjects(): Promise<number> {
  if (!cloud()) return 0;

  const pending = await listUnsyncedProjects();
  const result = await importLocalProjects(pending.map((summary) => summary.id));
  return result.imported;
}

/**
 * Work made as a guest that the account has never seen.
 *
 * "Unsynced" means the index still calls it local *and* the body is on this
 * device — a row that is only cloud metadata belongs to nobody here and must
 * not be offered for upload.
 */
export async function listUnsyncedProjects(): Promise<ProjectSummary[]> {
  const summaries = await projectStorage.list();
  const pending: ProjectSummary[] = [];

  for (const summary of summaries) {
    if (summary.origin === "cloud") continue;
    const project = await projectStorage.load(summary.id).catch(() => null);
    if (project) pending.push(summary);
  }

  return pending;
}

export interface ImportResult {
  imported: number;
  failed: string[];
}

/**
 * Upload chosen local projects to the signed-in account.
 *
 * One at a time and independently: a project that fails to upload must not
 * take the rest of the batch with it, and the local copy is never removed —
 * `saveProject` writes locally first, so a failed upload leaves the work
 * exactly where it was.
 */
export async function importLocalProjects(ids: string[]): Promise<ImportResult> {
  if (!cloud()) return { imported: 0, failed: [...ids] };

  let imported = 0;
  const failed: string[] = [];

  for (const id of ids) {
    const project = await projectStorage.load(id).catch(() => null);
    if (!project) {
      failed.push(id);
      continue;
    }

    const result = await saveProject(project).catch(() => null);
    if (result?.synced) imported += 1;
    else failed.push(id);
  }

  return { imported, failed };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summaryFromRow(
  row: ProjectSummaryRow,
  supabase: ReturnType<typeof getSupabaseClient>,
): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPublic: row.is_public,
    isPortfolio: row.is_portfolio,
    thumbnailUrl: row.thumbnail_path
      ? (supabase?.storage.from(STORAGE_BUCKETS.thumbnails).getPublicUrl(row.thumbnail_path).data
          .publicUrl ?? null)
      : null,
    origin: "cloud",
  };
}

/**
 * Local ids are readable (`proj_ab12…`); Postgres wants a UUID.
 *
 * Derived deterministically from the local id so the same project maps to the
 * same row every time, including across devices and reinstalls.
 */
function toUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < id.length; i += 1) {
    h1 = Math.imul(h1 ^ id.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + id.charCodeAt(i), 0x85ebca6b) >>> 0;
  }

  const hex = (value: number) => value.toString(16).padStart(8, "0");
  const raw = (hex(h1) + hex(h2) + hex(h1 ^ 0x5bf03635) + hex(h2 ^ 0xc2b2ae35)).slice(0, 32);

  return [
    raw.slice(0, 8),
    raw.slice(8, 12),
    // Version 4 and the RFC variant bits, so the value is a well-formed UUID.
    `4${raw.slice(13, 16)}`,
    `8${raw.slice(17, 20)}`,
    raw.slice(20, 32),
  ].join("-");
}

export { toUuid as projectUuid };
