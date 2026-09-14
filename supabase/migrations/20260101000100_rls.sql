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
