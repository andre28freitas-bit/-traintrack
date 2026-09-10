alter table public.traintrack_students
  add column if not exists photo_path text;

alter table public.traintrack_assessments
  add column if not exists body_metrics jsonb not null default '{}'::jsonb,
  add column if not exists photo_paths text[] not null default '{}'::text[];

alter table public.traintrack_events
  add column if not exists recurrence text not null default 'none',
  add column if not exists recurrence_until date;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'traintrack-media',
  'traintrack-media',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "traintrack media select own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'traintrack-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "traintrack media insert own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'traintrack-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "traintrack media update own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'traintrack-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'traintrack-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "traintrack media delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'traintrack-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant select, insert, update, delete on public.traintrack_students to authenticated;
grant select, insert, update, delete on public.traintrack_assessments to authenticated;
grant select, insert, update, delete on public.traintrack_events to authenticated;
