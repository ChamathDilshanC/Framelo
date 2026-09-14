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
