"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * The browser Supabase client.
 *
 * Created lazily and once. Returns `null` when no project is configured, which
 * is the normal guest-mode path — callers branch on that rather than catching
 * a constructor error, so the editor never depends on a backend existing.
 */

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (client) return client;

  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Throwing accessor for paths that have already checked configuration. */
export function requireSupabaseClient(): SupabaseClient {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Framelo is running in local mode — no Supabase project is configured.");
  }
  return supabase;
}
