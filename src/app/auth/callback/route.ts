import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Where an OAuth provider sends the browser back to.
 *
 * Supabase runs the provider handshake on its own domain and then redirects
 * here with a one-time `code`. That code is not a session — it has to be
 * exchanged for one, and the resulting tokens have to be written as cookies on
 * a response the browser will actually receive. A Server Component cannot write
 * cookies, which is why this is a route handler and not a page.
 *
 * This is the only new server surface Google sign-in needs. Everything else —
 * the session refresh in `proxy.ts`, the profile row, row level security — is
 * provider-agnostic and already worked for email sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // The provider reports a refusal by redirecting here with an error rather
  // than a code — a closed consent screen, a blocked account, a misconfigured
  // client. Surfacing it beats leaving the user on a blank page.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(failureUrl(origin, providerError));
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(failureUrl(origin, "Cloud sync is not configured."));
  }

  if (!code) {
    return NextResponse.redirect(failureUrl(origin, "The sign-in link was incomplete."));
  }

  // Cookies are written onto the response that performs the redirect, so the
  // session exists on the very first render of the destination.
  const response = NextResponse.redirect(new URL(next, origin));

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Deliberately not the provider's raw message: an exchange fails for
    // expired or replayed codes, and the useful advice is the same either way.
    return NextResponse.redirect(failureUrl(origin, "That sign-in link has expired. Try again."));
  }

  return response;
}

/**
 * Only ever redirect somewhere inside this site.
 *
 * `next` arrives in a URL, so it is attacker-controllable: a link built with
 * `?next=https://example.com` would turn this route into an open redirect that
 * borrows Framelo's domain to lend a phishing page credibility. Anything that
 * is not a single-slash relative path falls back to the dashboard.
 */
function safeNext(value: string | null): string {
  if (!value) return "/dashboard";
  // `//host` and `/\host` are protocol-relative: the browser reads them as
  // another origin even though they start with a slash.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

function failureUrl(origin: string, message: string): URL {
  const url = new URL("/dashboard", origin);
  url.searchParams.set("auth_error", message);
  return url;
}
