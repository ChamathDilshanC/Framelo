"use client";

import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { projectStorage } from "@/lib/storage/project-storage";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProfileRow } from "@/lib/supabase/types";

/**
 * Authentication, kept at arm's length from the editor.
 *
 * Nothing in the canvas, timeline or properties panel imports this. The editor
 * reads and writes local state and the sync layer decides whether there is an
 * account to push to — so signing in or out never remounts the editor, and the
 * whole product works signed out.
 */

export type AuthStatus = "loading" | "guest" | "authenticated";

/**
 * What the database trigger writes when it has no name to use.
 *
 * Treated as "empty" rather than as a choice, so an identity that arrives later
 * — from Google, or from a name typed at sign-up — is allowed to replace it.
 */
const PLACEHOLDER_DISPLAY_NAME = "Framelo user";

/**
 * A display name and picture out of whatever the provider supplied.
 *
 * Every provider names these differently, and Supabase passes the payload
 * through untouched: Google sends `name`/`full_name` and `picture`/`avatar_url`,
 * GitHub sends `user_name`, an email sign-up sends whatever the form put in
 * `options.data`. Reading several keys is cheaper than a provider branch.
 */
function identityFrom(user: User | null): { name: string | null; avatar: string | null } {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = meta[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  return {
    name: pick("full_name", "name", "display_name", "user_name", "preferred_username"),
    avatar: pick("avatar_url", "picture"),
  };
}

interface AuthStoreState {
  status: AuthStatus;
  user: User | null;
  profile: ProfileRow | null;
  /** False when no Supabase project is configured: the cloud simply is not there. */
  available: boolean;

  initialize: () => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Fill a missing name or picture from the sign-in provider. */
  adoptProviderIdentity: (profile: ProfileRow | null) => Promise<void>;
  updateProfile: (patch: Partial<Pick<ProfileRow, "username" | "display_name" | "bio">>) => Promise<void>;
}

let subscribed = false;
/** In-flight or completed bootstrap, so repeated mounts do not re-run it. */
let bootstrap: Promise<void> | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: isSupabaseConfigured ? "loading" : "guest",
  user: null,
  profile: null,
  available: isSupabaseConfigured,

  /**
   * Read the session and start listening for changes.
   *
   * Idempotent: mounted once at the app root, but safe to call from anywhere.
   * Every caller shares the first run's promise rather than issuing another
   * `getSession` and a second profile query.
   */
  async initialize() {
    if (bootstrap) return bootstrap;

    bootstrap = (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        set({ status: "guest", available: false });
        return;
      }

      const { data } = await supabase.auth.getSession();
      applySession(set, data.session);

      if (!subscribed) {
        subscribed = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          applySession(set, session);
          void get().refreshProfile();
        });
      }

      await get().refreshProfile();
    })();

    return bootstrap;
  },

  /**
   * Hand off to Google.
   *
   * Returns after the browser has been sent to Google, so the caller must not
   * treat resolution as "signed in" — the session only exists once the
   * provider redirects back to `/auth/callback` and the code is exchanged
   * there. `redirectTo` points at that route rather than straight at the
   * dashboard for exactly that reason.
   *
   * Note this is the app's own callback, not the one pasted into the Google
   * Cloud console. Google redirects to Supabase; Supabase redirects here.
   */
  async signInWithGoogle(next = "/dashboard") {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud sync is not configured for this deployment.");

    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: {
          // Ask for a refresh token and let someone pick a different account
          // instead of being silently signed back into the last one.
          access_type: "offline",
          prompt: "consent select_account",
        },
      },
    });

    if (error) throw error;
  },

  async signInWithEmail(email) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud sync is not configured for this deployment.");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  },

  async signInWithPassword(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud sync is not configured for this deployment.");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUpWithPassword(email, password, name) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Cloud sync is not configured for this deployment.");

    const trimmed = name?.trim();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        // Lands in `raw_user_meta_data`, which is where the profile trigger and
        // `adoptProviderIdentity` both look — so a password account gets a real
        // name by the same path an OAuth one does.
        data: trimmed ? { full_name: trimmed } : undefined,
      },
    });
    if (error) throw error;
  },

  /**
   * Sign out, and stop showing the account's projects.
   *
   * The dashboard's index is shared between guest work and cloud metadata, so
   * ending the session is not enough on its own: without this the previous
   * account's project names stayed on screen, and opening one failed because
   * its body only ever existed on the server.
   *
   * What the device genuinely holds is kept. "Your projects stay on this
   * device" has to remain true across a sign-out.
   */
  async signOut() {
    const supabase = getSupabaseClient();

    // Local state first, so the UI never shows an account's data after the
    // user has asked to leave — even if the network call is slow or fails.
    set({ status: "guest", user: null, profile: null });
    await projectStorage.forgetCloudOnlyProjects().catch(() => {});

    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async refreshProfile() {
    const supabase = getSupabaseClient();
    const user = get().user;
    if (!supabase || !user) {
      set({ profile: null });
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle();

    const profile = (data as ProfileRow | null) ?? null;
    set({ profile });

    await get().adoptProviderIdentity(profile);
  },

  /**
   * Fill in a name and picture the provider knows but the profile does not.
   *
   * Needed because the row is created by a database trigger the instant the
   * account appears, and for an OAuth sign-in that can be before — or without —
   * the provider's metadata, which is how a Google account ends up called
   * "Framelo user" with no picture. It also repairs accounts that already
   * exist, which a migration cannot do for a row that is already written.
   *
   * Only ever fills blanks. A name the user set themselves is never
   * overwritten by whatever Google happens to have on file.
   */
  async adoptProviderIdentity(profile) {
    const supabase = getSupabaseClient();
    const user = get().user;
    if (!supabase || !user) return;

    const identity = identityFrom(user);
    const patch: Partial<Pick<ProfileRow, "display_name" | "avatar_url">> = {};

    const currentName = profile?.display_name?.trim() ?? "";
    if (identity.name && (!currentName || currentName === PLACEHOLDER_DISPLAY_NAME)) {
      patch.display_name = identity.name;
    }
    if (identity.avatar && !profile?.avatar_url) {
      patch.avatar_url = identity.avatar;
    }

    if (Object.keys(patch).length === 0) return;

    // Upsert rather than update: if the trigger never ran there is no row to
    // update, and an account with no profile would stay nameless forever.
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...profile, ...patch }, { onConflict: "id" })
      .select("id,username,display_name,avatar_url,bio,created_at,updated_at")
      .maybeSingle();

    if (error) return;
    if (data) set({ profile: data as ProfileRow });
  },

  async updateProfile(patch) {
    const supabase = getSupabaseClient();
    const user = get().user;
    if (!supabase || !user) throw new Error("Sign in to update your profile.");

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) throw error;
    await get().refreshProfile();
  },
}));

type SetState = (partial: Partial<AuthStoreState>) => void;

function applySession(set: SetState, session: Session | null): void {
  set({
    status: session?.user ? "authenticated" : "guest",
    user: session?.user ?? null,
  });
}

export const selectIsAuthenticated = (state: AuthStoreState) => state.status === "authenticated";
export const selectUserId = (state: AuthStoreState) => state.user?.id ?? null;
