-- TopLogger module preferences: one row per user (selected gym, Top 10 window), readable and writable only by its owner.

create table public.toplogger_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gym_id text check (gym_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  top_days integer check (top_days in (60, 120, 180)),
  updated_at timestamptz not null default now()
);

alter table public.toplogger_prefs enable row level security;

create policy "toplogger_prefs_select_own" on public.toplogger_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "toplogger_prefs_insert_own" on public.toplogger_prefs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "toplogger_prefs_update_own" on public.toplogger_prefs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "toplogger_prefs_delete_own" on public.toplogger_prefs
  for delete to authenticated
  using ((select auth.uid()) = user_id);
