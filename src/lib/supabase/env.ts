/**
 * Supabase configuration, resolved once.
 *
 * Framelo is usable with none of this set: guest mode keeps projects in
 * `localStorage` and media in IndexedDB. `isSupabaseConfigured` is the single
 * switch every cloud feature checks, so a missing key degrades the product
 * rather than breaking it.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/** Placeholder values from `.env.example` must not count as configured. */
const isPlaceholder =
  url.includes("your-project-ref") || anonKey.startsWith("your-anon-key");

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;

export const isSupabaseConfigured =
  url.length > 0 && anonKey.length > 0 && !isPlaceholder;

/** Absolute origin for share links and Open Graph URLs. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
