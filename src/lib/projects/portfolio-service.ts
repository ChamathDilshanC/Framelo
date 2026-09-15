"use client";

import { projectUuid } from "@/lib/projects/project-service";
import { slugify } from "@/lib/slug";
import { getSupabaseClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, type PortfolioItemRow, type ProjectRow } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/auth-store";
import type { Project } from "@/types/project";

/**
 * Portfolio publishing.
 *
 * A portfolio item is a second, editable presentation of a project — its own
 * title, description and cover — so someone can publish "Onboarding flow" from
 * a project they still call "test 4". Publishing also flips the project public,
 * because a portfolio nobody can open is not a portfolio.
 */

export interface PortfolioEntry {
  id: string;
  projectId: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  isPublished: boolean;
  updatedAt: string;
}

export interface PublishInput {
  title: string;
  description?: string;
  slug?: string;
  coverImage?: string | null;
}

export class PortfolioUnavailableError extends Error {
  constructor() {
    super("Publishing needs an account. Sign in to build a portfolio.");
    this.name = "PortfolioUnavailableError";
  }
}

function session() {
  const supabase = getSupabaseClient();
  const userId = useAuthStore.getState().user?.id ?? null;
  return supabase && userId ? { supabase, userId } : null;
}

const ITEM_COLUMNS = "id,project_id,slug,title,description,cover_image,is_published,updated_at";

function toEntry(row: PortfolioItemRow): PortfolioEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImage: row.cover_image,
    isPublished: row.is_published,
    updatedAt: row.updated_at,
  };
}

export async function getPortfolioEntry(project: Project): Promise<PortfolioEntry | null> {
  const active = session();
  if (!active) return null;

  const { data } = await active.supabase
    .from("portfolio_items")
    .select(ITEM_COLUMNS)
    .eq("project_id", projectUuid(project.id))
    .maybeSingle();

  return data ? toEntry(data as PortfolioItemRow) : null;
}

/**
 * Publish, or update an existing publication.
 *
 * `upsert` on `project_id`, so re-publishing edits the entry in place instead
 * of producing a second card for the same project.
 */
export async function publishToPortfolio(
  project: Project,
  input: PublishInput,
): Promise<PortfolioEntry> {
  const active = session();
  if (!active) throw new PortfolioUnavailableError();

  const id = projectUuid(project.id);
  const title = input.title.trim() || project.name;
  const slug = slugify(input.slug?.trim() || title);

  const { data: projectRow } = await active.supabase
    .from("projects")
    .select("thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  const cover =
    input.coverImage ?? (projectRow as Pick<ProjectRow, "thumbnail_path"> | null)?.thumbnail_path ?? null;

  // A portfolio entry nobody can open is not a portfolio entry.
  await active.supabase
    .from("projects")
    .update({ is_public: true, is_portfolio: true })
    .eq("id", id)
    .eq("user_id", active.userId);

  const { data, error } = await active.supabase
    .from("portfolio_items")
    .upsert(
      {
        project_id: id,
        user_id: active.userId,
        slug,
        title,
        description: input.description?.trim() || null,
        cover_image: cover,
        is_published: true,
      },
      { onConflict: "project_id" },
    )
    .select(ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return toEntry(data as PortfolioItemRow);
}

export async function unpublishFromPortfolio(project: Project): Promise<void> {
  const active = session();
  if (!active) throw new PortfolioUnavailableError();

  const id = projectUuid(project.id);

  await Promise.all([
    active.supabase
      .from("portfolio_items")
      .update({ is_published: false })
      .eq("project_id", id)
      .eq("user_id", active.userId),
    active.supabase
      .from("projects")
      .update({ is_portfolio: false })
      .eq("id", id)
      .eq("user_id", active.userId),
  ]);
}

/** Public URL for a portfolio cover stored in the thumbnails bucket. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return supabase.storage.from(STORAGE_BUCKETS.thumbnails).getPublicUrl(path).data.publicUrl;
}
