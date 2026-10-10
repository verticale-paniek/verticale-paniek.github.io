-- hello-a example module: one counter row per user, readable and writable only by its owner.

create table public.hello_a_counters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.hello_a_counters enable row level security;

create policy "hello_a_counters_select_own" on public.hello_a_counters
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "hello_a_counters_insert_own" on public.hello_a_counters
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "hello_a_counters_update_own" on public.hello_a_counters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "hello_a_counters_delete_own" on public.hello_a_counters
  for delete to authenticated
  using ((select auth.uid()) = user_id);
