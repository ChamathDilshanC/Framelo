"use client";

import { projectUuid } from "@/lib/projects/project-service";
import { createShareToken } from "@/lib/slug";
import { getSupabaseClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/env";
import type { ProjectShareRow } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/auth-store";
import type { Project } from "@/types/project";

/**
 * Share links.
 *
 * A share is a project row flipped to `is_public` plus a random token pointing
 * at it. Both have to be true for anyone to read it, so revoking either one is
 * enough to kill the link — and the token is never derived from the project id,
 * so guessing one tells you nothing about the other.
 */

export type ShareVisibility = "private" | "link" | "public";

export interface ShareState {
  visibility: ShareVisibility;
  token: string | null;
  url: string | null;
}

export class ShareUnavailableError extends Error {
  constructor() {
    super("Sharing needs an account. Sign in to publish a link.");
    this.name = "ShareUnavailableError";
  }
}

function session() {
  const supabase = getSupabaseClient();
  const userId = useAuthStore.getState().user?.id ?? null;
  return supabase && userId ? { supabase, userId } : null;
}

export function shareUrl(token: string): string {
  return `${siteUrl()}/share/${token}`;
}

/**
 * The project's current share state.
 *
 * Read once when the dialog opens. The existing token is reused rather than
 * rotated — a link someone already sent must keep working, and minting a new
 * token per dialog open would quietly break every link ever shared.
 */
export async function getShareState(project: Project): Promise<ShareState> {
  const active = session();
  if (!active) return { visibility: "private", token: null, url: null };

  const id = projectUuid(project.id);

  const [{ data: projectRow }, { data: shareRow }] = await Promise.all([
    active.supabase.from("projects").select("is_public").eq("id", id).maybeSingle(),
    active.supabase
      .from("project_shares")
      .select("share_token,is_active")
      .eq("project_id", id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const isPublic = Boolean((projectRow as { is_public?: boolean } | null)?.is_public);
  const token = (shareRow as Pick<ProjectShareRow, "share_token"> | null)?.share_token ?? null;

  return {
    visibility: isPublic && token ? "link" : "private",
    token,
    url: token ? shareUrl(token) : null,
  };
}

/**
 * Turn sharing on.
 *
 * Idempotent: called on an already-shared project it returns the existing link
 * without touching the database, which is what makes the Share button feel
 * instant on the second open.
 */
export async function enableSharing(project: Project): Promise<ShareState> {
  const active = session();
  if (!active) throw new ShareUnavailableError();

  const existing = await getShareState(project);
  if (existing.token) {
    if (existing.visibility === "private") {
      await active.supabase.from("projects").update({ is_public: true }).eq("id", projectUuid(project.id));
    }
    return { ...existing, visibility: "link" };
  }

  const id = projectUuid(project.id);
  const token = createShareToken();

  const { error: publishError } = await active.supabase
    .from("projects")
    .update({ is_public: true })
    .eq("id", id)
    .eq("user_id", active.userId);

  if (publishError) throw publishError;

  const { error } = await active.supabase.from("project_shares").insert({
    project_id: id,
    user_id: active.userId,
    share_token: token,
    is_active: true,
  });

  if (error) throw error;

  return { visibility: "link", token, url: shareUrl(token) };
}

/**
 * Turn sharing off.
 *
 * The token row is kept but deactivated, and the project is un-published. Two
 * independent gates close, so a cached page or a half-open session cannot keep
 * reading the row.
 */
export async function disableSharing(project: Project): Promise<ShareState> {
  const active = session();
  if (!active) throw new ShareUnavailableError();

  const id = projectUuid(project.id);

  await Promise.all([
    active.supabase.from("projects").update({ is_public: false }).eq("id", id).eq("user_id", active.userId),
    active.supabase
      .from("project_shares")
      .update({ is_active: false })
      .eq("project_id", id)
      .eq("user_id", active.userId),
  ]);

  return { visibility: "private", token: null, url: null };
}
