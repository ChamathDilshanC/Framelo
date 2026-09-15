import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Keeps the Supabase session cookie fresh.
 *
 * Next calls this file convention "proxy"; it was `middleware.ts` in earlier
 * versions.
 *
 * Server Components cannot write cookies, so a token that expires mid-session
 * would leave the dashboard rendering as a guest until the next full reload.
 * Refreshing here is the one place that can set them.
 *
 * Public routes are excluded from the matcher entirely: a share link is read by
 * people with no session, and running auth for them would only cost latency and
 * make the response uncacheable.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(entries) {
        for (const { name, value, options } of entries) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching the user is what triggers the refresh; the result is unused.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/editor/:path*"],
};
