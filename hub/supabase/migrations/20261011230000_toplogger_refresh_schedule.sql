-- Daily renewal of TopLogger connections (see supabase/functions/toplogger-refresh).
-- pg_cron calls the Edge Function through pg_net, sending a shared secret read from Supabase Vault.
-- The secret itself is NOT in this repo. One-time setup (SQL editor), same value as the Edge Function
-- secret TOPLOGGER_CRON_SECRET:
--   select vault.create_secret('<secret>', 'toplogger_cron_secret');
-- Until both exist the function answers 401 and nothing is renewed (the app still refreshes on use).
-- The project URL is public, like the one in the keepalive migration.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'toplogger-refresh',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://hxdewvqtnivgkbdgvpnc.supabase.co/functions/v1/toplogger-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'toplogger_cron_secret'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
