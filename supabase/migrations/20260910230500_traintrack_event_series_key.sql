alter table public.traintrack_events
add column if not exists series_key uuid not null default gen_random_uuid();

create index if not exists idx_traintrack_events_owner_series_key
on public.traintrack_events(owner_id, series_key);

comment on column public.traintrack_events.series_key is
'Stable identifier shared by a recurring series and any detached or split occurrences derived from it.';
