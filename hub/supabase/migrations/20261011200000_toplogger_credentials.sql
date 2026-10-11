-- TopLogger module: one encrypted credential row per user.
-- RLS is on with NO policies, and all privileges are revoked from anon/authenticated: only Edge Functions
-- using the service-role key can read or write this table. Users never see their own token.

create table public.toplogger_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- base64(iv || AES-256-GCM ciphertext) of the JSON token pair; the user id is bound as authenticated data.
  token_ciphertext text not null,
  key_version smallint not null default 1,
  -- Scheduling/expiry checks only; the encrypted bundle is the source of truth.
  refresh_expires_at timestamptz not null,
  status text not null default 'connected' check (status in ('connected', 'reconnect_required')),
  last_error text,
  -- Optimistic concurrency: every write replaces it, and refreshes only write if it is unchanged.
  version uuid not null default gen_random_uuid(),
  -- Lease so only one instance exchanges a (single-use) refresh token at a time.
  refresh_lock_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.toplogger_credentials enable row level security;
revoke all on table public.toplogger_credentials from anon, authenticated;
