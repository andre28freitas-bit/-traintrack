alter table public.traintrack_events
add column if not exists recurrence_exceptions jsonb not null default '[]'::jsonb;

comment on column public.traintrack_events.recurrence_exceptions is
'ISO timestamps of recurring occurrences excluded because they were edited or deleted individually.';
