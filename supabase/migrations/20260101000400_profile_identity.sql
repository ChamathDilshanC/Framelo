-- ---------------------------------------------------------------------------
-- Profile identity: real names and pictures
-- ---------------------------------------------------------------------------
-- The original trigger read only `full_name` and never touched `avatar_url`,
-- so an account created through an OAuth provider arrived called "Framelo user"
-- with no picture — even though the provider had sent both.
--
-- Two things are wrong with reading one key. Providers disagree about names:
-- Google sends `name` and `full_name`, GitHub sends `user_name`, an email
-- sign-up sends whatever the form put in `options.data`. And the picture was
-- simply never read.
--
-- The client repairs its own row too (`adoptProviderIdentity`), which is what
-- fixes accounts that already exist — a trigger cannot reach a row that was
-- written before it changed. This migration makes the database right at the
-- source so that repair has nothing to do on a fresh account.
-- ---------------------------------------------------------------------------

-- The first non-empty value among several metadata keys.
--
-- `with ordinality` and the explicit `order by` are load-bearing: "first" has
-- to mean first in the order the caller listed, so `full_name` beats `name`
-- deterministically. A bare `unnest` happens to preserve array order today but
-- is not required to, and the difference would be a silently wrong name.
create or replace function public.first_meta_text(meta jsonb, variadic keys text[])
returns text
language sql
immutable
as $$
  select v.value
  from unnest(keys) with ordinality as k(key, ord)
  cross join lateral (select nullif(trim(meta ->> k.key), '') as value) v
  where v.value is not null
  order by k.ord
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      public.first_meta_text(
        new.raw_user_meta_data,
        'full_name', 'name', 'display_name', 'user_name', 'preferred_username'
      ),
      -- Still better than nothing when a provider sends no name at all; the
      -- client treats this exact string as "unset" and replaces it later.
      'Framelo user'
    ),
    public.first_meta_text(new.raw_user_meta_data, 'avatar_url', 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Rows already written with the placeholder, or with no picture. Only blanks
-- are filled: a name somebody chose for themselves is left exactly as it is.
update public.profiles as p
set
  display_name = coalesce(
    nullif(nullif(trim(p.display_name), ''), 'Framelo user'),
    public.first_meta_text(
      u.raw_user_meta_data,
      'full_name', 'name', 'display_name', 'user_name', 'preferred_username'
    ),
    p.display_name
  ),
  avatar_url = coalesce(
    nullif(trim(p.avatar_url), ''),
    public.first_meta_text(u.raw_user_meta_data, 'avatar_url', 'picture')
  )
from auth.users as u
where u.id = p.id
  and (
    p.display_name is null
    or trim(p.display_name) = ''
    or trim(p.display_name) = 'Framelo user'
    or p.avatar_url is null
    or trim(p.avatar_url) = ''
  );
