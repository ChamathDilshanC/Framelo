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
