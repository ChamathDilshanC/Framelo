import "server-only";

import { getPublicSupabase } from "@/lib/supabase/server";
import { STORAGE_BUCKETS, type PortfolioItemRow, type ProfileRow, type SharedProjectRow } from "@/lib/supabase/types";
import { parseProject } from "@/lib/validation/project-schema";
import type { Project } from "@/types/project";

/**
 * Reads for the public pages.
 *
 * Server-only, and deliberately narrow. Every function here returns a shape
 * that was written out by hand, so adding a column to `projects` can never
 * accidentally start publishing it. Nothing returns an email, a user id, a
 * private asset path or an internal timestamp.
 */

export interface PublicProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  project: Project;
  thumbnailUrl: string | null;
  updatedAt: string;
  author: { name: string | null; username: string | null };
}

export interface PublicPortfolioItem {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  shareToken: string | null;
  updatedAt: string;
}

export interface PublicProfile {
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

function publicThumbnail(path: string | null): string | null {
  if (!path) return null;
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  return supabase.storage.from(STORAGE_BUCKETS.thumbnails).getPublicUrl(path).data.publicUrl;
}

/**
 * Resolve a share token.
 *
 * Goes through the `get_shared_project` security-definer function rather than
 * querying tables directly: that function is the entire anonymous read surface,
 * it returns exactly the public columns, and it cannot be used to enumerate
 * tokens or reach an unshared project.
 */
export async function getSharedProject(token: string): Promise<PublicProject | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;
  if (!/^[a-z0-9]{16,64}$/i.test(token)) return null;

  const { data, error } = await supabase.rpc("get_shared_project", { token }).maybeSingle();
  if (error || !data) return null;

  const row = data as SharedProjectRow;
  const parsed = parseProject(row.project_data);
  if (!parsed.ok || !parsed.project) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    project: parsed.project,
    thumbnailUrl: publicThumbnail(row.thumbnail_path),
    updatedAt: row.updated_at,
    author: { name: row.author_name, username: row.author_username },
  };
}

/** Published portfolio entries for one profile. */
export async function getPortfolio(
  username: string,
): Promise<{ profile: PublicProfile; items: PublicPortfolioItem[] } | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("username,display_name,bio,avatar_url,id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profileRow) return null;
  const profile = profileRow as ProfileRow;

  const { data } = await supabase
    .from("portfolio_items")
    .select("slug,title,description,cover_image,updated_at,project_id")
    .eq("user_id", profile.id)
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as Array<PortfolioItemRow & { project_id: string }>;

  // One query for every card's share token, rather than one per card.
  const tokens = await shareTokensFor(rows.map((row) => row.project_id));

  return {
    profile: {
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
    },
    items: rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverUrl: publicThumbnail(row.cover_image),
      shareToken: tokens.get(row.project_id) ?? null,
      updatedAt: row.updated_at,
    })),
  };
}

/** The most recently published work across every profile. */
export async function getPortfolioFeed(limit = 24): Promise<
  Array<PublicPortfolioItem & { authorUsername: string | null; authorName: string | null }>
> {
  const supabase = getPublicSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("portfolio_items")
    .select("slug,title,description,cover_image,updated_at,project_id,user_id")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Array<PortfolioItemRow & { project_id: string; user_id: string }>;
  if (rows.length === 0) return [];

  const [tokens, { data: profiles }] = await Promise.all([
    shareTokensFor(rows.map((row) => row.project_id)),
    supabase
      .from("profiles")
      .select("id,username,display_name")
      .in("id", [...new Set(rows.map((row) => row.user_id))]),
  ]);

  const byId = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const author = byId.get(row.user_id);
    return {
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverUrl: publicThumbnail(row.cover_image),
      shareToken: tokens.get(row.project_id) ?? null,
      updatedAt: row.updated_at,
      authorUsername: author?.username ?? null,
      authorName: author?.display_name ?? null,
    };
  });
}

/**
 * Share tokens for a set of projects.
 *
 * Portfolio cards link through the share route, so a card needs its token — but
 * this is a published project the caller can already open, so exposing the token
 * for it reveals nothing new.
 */
async function shareTokensFor(projectIds: string[]): Promise<Map<string, string>> {
  const supabase = getPublicSupabase();
  if (!supabase || projectIds.length === 0) return new Map();

  const { data } = await supabase
    .from("project_shares")
    .select("project_id,share_token")
    .in("project_id", projectIds)
    .eq("is_active", true);

  return new Map(
    ((data ?? []) as Array<{ project_id: string; share_token: string }>).map((row) => [
      row.project_id,
      row.share_token,
    ]),
  );
}

/** Resolve a portfolio entry to the share token its page should render. */
export async function getPortfolioItem(
  username: string,
  slug: string,
): Promise<{ item: PublicPortfolioItem; profile: PublicProfile } | null> {
  const portfolio = await getPortfolio(username);
  if (!portfolio) return null;

  const item = portfolio.items.find((entry) => entry.slug === slug);
  return item ? { item, profile: portfolio.profile } : null;
}
