import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Server-side Supabase clients.
 *
 * Both use the anon key: every read below is one the browser could make too,
 * and row level security is what actually protects the data. The service-role
 * key is never referenced anywhere in this repository.
 */

/** Request-scoped client that can read and refresh the user's session. */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(entries) {
        try {
          for (const { name, value, options } of entries) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session is refreshed by middleware instead, so this is not an error.
        }
      },
    },
  });
}

/**
 * Session-less client for public pages.
 *
 * Share and portfolio pages are rendered for anonymous visitors, so reading
 * cookies would only vary the cache for no benefit.
 */
export function getPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* anonymous: nothing to persist */
      },
    },
  });
}
