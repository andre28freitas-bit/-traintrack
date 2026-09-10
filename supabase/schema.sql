-- TrainTrack isolated tables for a shared Supabase project.
-- This migration does not modify salon tables or the existing auth trigger.

create extension if not exists pgcrypto;

create table if not exists public.traintrack_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traintrack_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  birth_date date not null,
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  evaluation_interval_months integer not null default 1 check (evaluation_interval_months between 0 and 24),
  evaluation_alert_days integer not null default 2 check (evaluation_alert_days between 0 and 30),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traintrack_test_definitions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sort_order integer not null default 1,
  name text not null,
  category text not null,
  unit text,
  ideal_value text,
  scoring_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traintrack_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.traintrack_students(id) on delete cascade,
  assessment_date date not null,
  values jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traintrack_workouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.traintrack_students(id) on delete cascade,
  workout_date date not null,
  workout_type text not null,
  duration_min integer,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traintrack_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references public.traintrack_students(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  event_type text not null default 'Treino',
  location text,
  notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint traintrack_events_time_check check (ends_at > starts_at)
);

create index if not exists traintrack_students_owner_idx on public.traintrack_students(owner_id);
create index if not exists traintrack_assessments_owner_student_date_idx on public.traintrack_assessments(owner_id, student_id, assessment_date);
create index if not exists traintrack_assessments_student_idx on public.traintrack_assessments(student_id);
create index if not exists traintrack_workouts_owner_student_date_idx on public.traintrack_workouts(owner_id, student_id, workout_date);
create index if not exists traintrack_workouts_student_idx on public.traintrack_workouts(student_id);
create index if not exists traintrack_events_owner_start_idx on public.traintrack_events(owner_id, starts_at);
create index if not exists traintrack_events_student_idx on public.traintrack_events(student_id);
create index if not exists traintrack_test_definitions_owner_sort_idx on public.traintrack_test_definitions(owner_id, sort_order);

create or replace function public.traintrack_set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.traintrack_set_updated_at() from public, anon, authenticated;

drop trigger if exists traintrack_profiles_set_updated_at on public.traintrack_profiles;
create trigger traintrack_profiles_set_updated_at before update on public.traintrack_profiles for each row execute function public.traintrack_set_updated_at();
drop trigger if exists traintrack_students_set_updated_at on public.traintrack_students;
create trigger traintrack_students_set_updated_at before update on public.traintrack_students for each row execute function public.traintrack_set_updated_at();
drop trigger if exists traintrack_tests_set_updated_at on public.traintrack_test_definitions;
create trigger traintrack_tests_set_updated_at before update on public.traintrack_test_definitions for each row execute function public.traintrack_set_updated_at();
drop trigger if exists traintrack_assessments_set_updated_at on public.traintrack_assessments;
create trigger traintrack_assessments_set_updated_at before update on public.traintrack_assessments for each row execute function public.traintrack_set_updated_at();
drop trigger if exists traintrack_workouts_set_updated_at on public.traintrack_workouts;
create trigger traintrack_workouts_set_updated_at before update on public.traintrack_workouts for each row execute function public.traintrack_set_updated_at();
drop trigger if exists traintrack_events_set_updated_at on public.traintrack_events;
create trigger traintrack_events_set_updated_at before update on public.traintrack_events for each row execute function public.traintrack_set_updated_at();

alter table public.traintrack_profiles enable row level security;
alter table public.traintrack_students enable row level security;
alter table public.traintrack_test_definitions enable row level security;
alter table public.traintrack_assessments enable row level security;
alter table public.traintrack_workouts enable row level security;
alter table public.traintrack_events enable row level security;

revoke all on table public.traintrack_profiles, public.traintrack_students, public.traintrack_test_definitions, public.traintrack_assessments, public.traintrack_workouts, public.traintrack_events from anon;
grant select, insert, update, delete on table public.traintrack_profiles, public.traintrack_students, public.traintrack_test_definitions, public.traintrack_assessments, public.traintrack_workouts, public.traintrack_events to authenticated;

drop policy if exists traintrack_profiles_select_own on public.traintrack_profiles;
create policy traintrack_profiles_select_own on public.traintrack_profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists traintrack_profiles_insert_own on public.traintrack_profiles;
create policy traintrack_profiles_insert_own on public.traintrack_profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists traintrack_profiles_update_own on public.traintrack_profiles;
create policy traintrack_profiles_update_own on public.traintrack_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists traintrack_profiles_delete_own on public.traintrack_profiles;
create policy traintrack_profiles_delete_own on public.traintrack_profiles for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists traintrack_students_select_own on public.traintrack_students;
create policy traintrack_students_select_own on public.traintrack_students for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists traintrack_students_insert_own on public.traintrack_students;
create policy traintrack_students_insert_own on public.traintrack_students for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists traintrack_students_update_own on public.traintrack_students;
create policy traintrack_students_update_own on public.traintrack_students for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists traintrack_students_delete_own on public.traintrack_students;
create policy traintrack_students_delete_own on public.traintrack_students for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists traintrack_tests_select_own on public.traintrack_test_definitions;
create policy traintrack_tests_select_own on public.traintrack_test_definitions for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists traintrack_tests_insert_own on public.traintrack_test_definitions;
create policy traintrack_tests_insert_own on public.traintrack_test_definitions for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists traintrack_tests_update_own on public.traintrack_test_definitions;
create policy traintrack_tests_update_own on public.traintrack_test_definitions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists traintrack_tests_delete_own on public.traintrack_test_definitions;
create policy traintrack_tests_delete_own on public.traintrack_test_definitions for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists traintrack_assessments_select_own on public.traintrack_assessments;
create policy traintrack_assessments_select_own on public.traintrack_assessments for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists traintrack_assessments_insert_own on public.traintrack_assessments;
create policy traintrack_assessments_insert_own on public.traintrack_assessments for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_assessments_update_own on public.traintrack_assessments;
create policy traintrack_assessments_update_own on public.traintrack_assessments for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_assessments_delete_own on public.traintrack_assessments;
create policy traintrack_assessments_delete_own on public.traintrack_assessments for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists traintrack_workouts_select_own on public.traintrack_workouts;
create policy traintrack_workouts_select_own on public.traintrack_workouts for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists traintrack_workouts_insert_own on public.traintrack_workouts;
create policy traintrack_workouts_insert_own on public.traintrack_workouts for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_workouts_update_own on public.traintrack_workouts;
create policy traintrack_workouts_update_own on public.traintrack_workouts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_workouts_delete_own on public.traintrack_workouts;
create policy traintrack_workouts_delete_own on public.traintrack_workouts for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists traintrack_events_select_own on public.traintrack_events;
create policy traintrack_events_select_own on public.traintrack_events for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists traintrack_events_insert_own on public.traintrack_events;
create policy traintrack_events_insert_own on public.traintrack_events for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_events_update_own on public.traintrack_events;
create policy traintrack_events_update_own on public.traintrack_events for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id and exists (select 1 from public.traintrack_students s where s.id = student_id and s.owner_id = (select auth.uid())));
drop policy if exists traintrack_events_delete_own on public.traintrack_events;
create policy traintrack_events_delete_own on public.traintrack_events for delete to authenticated using ((select auth.uid()) = owner_id);
