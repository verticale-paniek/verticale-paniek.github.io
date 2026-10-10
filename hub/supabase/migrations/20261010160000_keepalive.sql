-- Keepalive: Supabase pauses free projects after ~1 week without traffic.
-- A daily pg_cron job makes a real API request (via pg_net) to this function, which counts as activity.
-- The URL and key below are the public ones also shipped in the site. If the anon/publishable key
-- is ever rotated, update the job (select cron.schedule(...) again with the same name).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.keepalive()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.keepalive() to anon, authenticated;

select cron.schedule(
  'keepalive',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://hxdewvqtnivgkbdgvpnc.supabase.co/rest/v1/rpc/keepalive',
    headers := jsonb_build_object(
      'apikey', 'sb_publishable_qXTJSta5shrOqRRZMg6wIA_e9m3FM_7',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
