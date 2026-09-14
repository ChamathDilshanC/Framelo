-- ---------------------------------------------------------------------------
-- Framelo — complete schema
-- ---------------------------------------------------------------------------
-- Generated from supabase/migrations/. Those files are the source of truth;
-- this is the same SQL concatenated so it can be pasted into the Supabase SQL
-- editor and run in one go for a first-time setup.
--
-- Safe to re-run: every statement is idempotent (create ... if not exists,
-- create or replace, drop policy if exists, on conflict do update).
--
-- Source files, in order:
--   20260101000000_init.sql
--   20260101000100_rls.sql
--   20260101000200_storage.sql
--   20260101000300_patterns.sql
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 20260101000000_init.sql
-- ===========================================================================

-- Framelo — core schema.
--
-- Design notes
--   * Editor state is document-shaped, so `projects.project_data` is a single
--     JSONB column rather than a normalised table per animation property. The
--     editor is local-first: this row is a debounced snapshot, never the
--     animation engine.
--   * Every user-owned table has RLS on. Public read paths are narrow and
--     explicit (an active share token, or a published portfolio item).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  display_name text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$')
);

comment on table public.profiles is
  'Public-facing user profile. Never holds email or auth data.';

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null default 'Untitled project',
  slug           text not null,
  description    text,
  project_data   jsonb not null,
  thumbnail_path text,
  is_public      boolean not null default false,
  is_portfolio   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint projects_name_length check (char_length(name) between 1 and 120),
  constraint projects_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,90}$')
);

-- The dashboard lists one user's projects newest-first; this covers it whole.
create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

-- Portfolio and public listings filter on these before reading any JSON.
create index if not exists projects_public_idx
  on public.projects (updated_at desc) where is_public;

create unique index if not exists projects_user_slug_idx
  on public.projects (user_id, slug);

-- ---------------------------------------------------------------------------
-- project_assets
-- ---------------------------------------------------------------------------
create table if not exists public.project_assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  storage_path text not null unique,
  mime_type    text not null,
  width        integer,
  height       integer,
  size         bigint not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists project_assets_project_idx
  on public.project_assets (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- project_shares
-- ---------------------------------------------------------------------------
create table if not exists public.project_shares (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  share_token text not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,

  -- The token is the only secret protecting a share, so a short one is a
  -- security bug, not a cosmetic one.
  constraint project_shares_token_length check (char_length(share_token) >= 16)
);

-- One live share per project: the editor reuses the link instead of minting a
-- new token every time the dialog opens.
create unique index if not exists project_shares_active_project_idx
  on public.project_shares (project_id) where is_active;

create index if not exists project_shares_token_idx
  on public.project_shares (share_token) where is_active;

-- ---------------------------------------------------------------------------
-- portfolio_items
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_items (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  slug         text not null,
  title        text not null,
  description  text,
  cover_image  text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint portfolio_items_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,90}$'),
  constraint portfolio_items_title_length check (char_length(title) between 1 and 140)
);

create unique index if not exists portfolio_items_user_slug_idx
  on public.portfolio_items (user_id, slug);

create unique index if not exists portfolio_items_project_idx
  on public.portfolio_items (project_id);

create index if not exists portfolio_items_published_idx
  on public.portfolio_items (user_id, updated_at desc) where is_published;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists portfolio_items_touch_updated_at on public.portfolio_items;
create trigger portfolio_items_touch_updated_at
  before update on public.portfolio_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Framelo user'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===========================================================================
-- 20260101000100_rls.sql
-- ===========================================================================

-- Framelo — row level security.
--
-- Rule of thumb: a user reaches their own rows through `auth.uid()`, and the
-- public reaches a row only through a deliberate, revocable pointer — an active
-- share token, or a published portfolio item. There is no "public read all".

alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.project_assets enable row level security;
alter table public.project_shares enable row level security;
alter table public.portfolio_items enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- Security definer so the public share/portfolio policies can look past RLS on
-- the pointer tables without granting a blanket read of them.
create or replace function public.project_is_shared(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_shares s
    where s.project_id = target
      and s.is_active
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create or replace function public.project_is_published(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portfolio_items p
    where p.project_id = target
      and p.is_published
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Profiles are the public identity behind a portfolio, so they are readable —
-- but the table deliberately holds no email or auth data.
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
  on public.profiles for select
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
  on public.projects for select
  using (auth.uid() = user_id);

-- Anonymous read is gated twice: the owner must have flipped `is_public`, and
-- there must be a live pointer at the row. Revoking either kills the link.
drop policy if exists projects_select_shared on public.projects;
create policy projects_select_shared
  on public.projects for select
  using (
    is_public
    and (public.project_is_shared(id) or public.project_is_published(id))
  );

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own
  on public.projects for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- project_assets
-- ---------------------------------------------------------------------------
drop policy if exists project_assets_select_own on public.project_assets;
create policy project_assets_select_own
  on public.project_assets for select
  using (auth.uid() = user_id);

-- A shared project's viewer needs its screen media, and nothing else about it.
drop policy if exists project_assets_select_shared on public.project_assets;
create policy project_assets_select_shared
  on public.project_assets for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.is_public
        and (public.project_is_shared(p.id) or public.project_is_published(p.id))
    )
  );

drop policy if exists project_assets_write_own on public.project_assets;
create policy project_assets_write_own
  on public.project_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- project_shares
-- ---------------------------------------------------------------------------
drop policy if exists project_shares_select_own on public.project_shares;
create policy project_shares_select_own
  on public.project_shares for select
  using (auth.uid() = user_id);

drop policy if exists project_shares_write_own on public.project_shares;
create policy project_shares_write_own
  on public.project_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- portfolio_items
-- ---------------------------------------------------------------------------
drop policy if exists portfolio_items_select_published on public.portfolio_items;
create policy portfolio_items_select_published
  on public.portfolio_items for select
  using (is_published or auth.uid() = user_id);

drop policy if exists portfolio_items_write_own on public.portfolio_items;
create policy portfolio_items_write_own
  on public.portfolio_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- resolving a share token without exposing the share table
-- ---------------------------------------------------------------------------
-- Anonymous callers must be able to turn a token into a project, but must not
-- be able to enumerate tokens. A security-definer function returning exactly
-- the public fields is the whole public read surface.
create or replace function public.get_shared_project(token text)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  project_data jsonb,
  thumbnail_path text,
  updated_at timestamptz,
  author_name text,
  author_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.slug,
    p.description,
    p.project_data,
    p.thumbnail_path,
    p.updated_at,
    pr.display_name,
    pr.username
  from public.project_shares s
  join public.projects p on p.id = s.project_id
  left join public.profiles pr on pr.id = p.user_id
  where s.share_token = token
    and s.is_active
    and p.is_public
    and (s.expires_at is null or s.expires_at > now())
  limit 1;
$$;

revoke all on function public.get_shared_project(text) from public;
grant execute on function public.get_shared_project(text) to anon, authenticated;


-- ===========================================================================
-- 20260101000200_storage.sql
-- ===========================================================================

-- Framelo — storage buckets and policies.
--
-- Path convention, enforced by the policies below:
--   <userId>/<projectId>/assets/<file>
--   <userId>/<projectId>/thumbnail.webp
--   <userId>/<projectId>/exports/<file>
--
-- The first path segment is the owner's id, so "you may write under your own
-- id" is expressible as a policy and needs no table lookup.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-assets', 'project-assets', false, 26214400,
   array['image/png', 'image/jpeg', 'image/webp']),
  -- Thumbnails are public: they are the poster frame of a share link and an
  -- Open Graph image, both of which are fetched by clients that carry no session.
  ('project-thumbnails', 'project-thumbnails', true, 2097152,
   array['image/webp', 'image/png', 'image/jpeg']),
  ('exports', 'exports', false, 104857600,
   array['image/png', 'image/jpeg', 'image/webp', 'video/webm', 'video/mp4'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- ---------------------------------------------------------------------------
-- project-assets — private, owner only
-- ---------------------------------------------------------------------------
drop policy if exists "project assets are readable by their owner" on storage.objects;
create policy "project assets are readable by their owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project assets are writable by their owner" on storage.objects;
create policy "project assets are writable by their owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project assets are updatable by their owner" on storage.objects;
create policy "project assets are updatable by their owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project assets are removable by their owner" on storage.objects;
create policy "project assets are removable by their owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- project-thumbnails — world readable, owner writable
-- ---------------------------------------------------------------------------
drop policy if exists "thumbnails are publicly readable" on storage.objects;
create policy "thumbnails are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-thumbnails');

drop policy if exists "thumbnails are writable by their owner" on storage.objects;
create policy "thumbnails are writable by their owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "thumbnails are updatable by their owner" on storage.objects;
create policy "thumbnails are updatable by their owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "thumbnails are removable by their owner" on storage.objects;
create policy "thumbnails are removable by their owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- exports — private, owner only
-- ---------------------------------------------------------------------------
drop policy if exists "exports are readable by their owner" on storage.objects;
create policy "exports are readable by their owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exports are writable by their owner" on storage.objects;
create policy "exports are writable by their owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "exports are removable by their owner" on storage.objects;
create policy "exports are removable by their owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ===========================================================================
-- 20260101000300_patterns.sql
-- ===========================================================================

-- Framelo — saved background patterns.
--
-- Patterns are stored as validated data, never as executable code: the columns
-- below map one-to-one onto the safe CSS properties the renderer applies. The
-- application validates them again on the way in and on the way out, because a
-- row written by an older client must still be safe to render today.

create table if not exists public.user_patterns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null,
  category            text not null default 'custom',
  background_color    text,
  background_image    text,
  background_size     text,
  background_position text,
  opacity             real not null default 1,
  created_at          timestamptz not null default now(),

  constraint user_patterns_name_length check (char_length(name) between 1 and 80),
  constraint user_patterns_opacity_range check (opacity >= 0 and opacity <= 1),
  -- Belt and braces behind the application validator: a stored value can never
  -- be a script URL or a legacy IE expression, whatever wrote the row.
  constraint user_patterns_image_safe check (
    background_image is null or (
      char_length(background_image) <= 4000
      and background_image !~* 'javascript:'
      and background_image !~* 'expression\s*\('
      and background_image !~* '<\s*script'
    )
  )
);

create index if not exists user_patterns_user_idx
  on public.user_patterns (user_id, created_at desc);

alter table public.user_patterns enable row level security;

drop policy if exists user_patterns_own on public.user_patterns;
create policy user_patterns_own
  on public.user_patterns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
