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
