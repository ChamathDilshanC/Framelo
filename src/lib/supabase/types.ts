/**
 * Row shapes for the tables in `supabase/migrations/`.
 *
 * Hand-written rather than generated so the repo type-checks without a
 * database connection; they are the contract the queries are written against.
 */

export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  project_data: unknown;
  thumbnail_path: string | null;
  is_public: boolean;
  is_portfolio: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * The columns the dashboard needs. Listing never pulls `project_data`: a page
 * of twenty projects would otherwise transfer megabytes of keyframes to render
 * a grid of names and thumbnails.
 */
export type ProjectSummaryRow = Pick<
  ProjectRow,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "thumbnail_path"
  | "is_public"
  | "is_portfolio"
  | "created_at"
  | "updated_at"
>;

export const PROJECT_SUMMARY_COLUMNS =
  "id,name,slug,description,thumbnail_path,is_public,is_portfolio,created_at,updated_at";

export interface ProjectAssetRow {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size: number;
  created_at: string;
}

export interface ProjectShareRow {
  id: string;
  project_id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface PortfolioItemRow {
  id: string;
  project_id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPatternRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  background_color: string | null;
  background_image: string | null;
  background_size: string | null;
  background_position: string | null;
  opacity: number;
  created_at: string;
}

/** Return shape of the `get_shared_project` security-definer function. */
export interface SharedProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  project_data: unknown;
  thumbnail_path: string | null;
  updated_at: string;
  author_name: string | null;
  author_username: string | null;
}

export const STORAGE_BUCKETS = {
  assets: "project-assets",
  thumbnails: "project-thumbnails",
  exports: "exports",
} as const;
