# TopLogger setup

One-time owner steps for the TopLogger module, after the general setup in `../setup.md`. What these secrets do is explained in `authentication.md`.

## 1. Encryption key

Before the first deploy of the `toplogger` function, set its encryption key once (Edge Function secret, never in the repo):

1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Supabase dashboard > your project > Edge Functions > Secrets: add `TOPLOGGER_ENCRYPTION_KEY` with that value. (CLI alternative: `npx supabase login`, then `npx supabase secrets set TOPLOGGER_ENCRYPTION_KEY=<key> --project-ref <ref>`.)
3. Keep a copy in your password manager. If the key is lost, all stored TopLogger connections are unreadable and everyone must reconnect.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically.

## 2. Daily renewal secret

For the daily renewal job (`toplogger-refresh`), create a second random value (same `node -e` command) and store it in two places, identically:

1. Edge Functions > Secrets: `TOPLOGGER_CRON_SECRET`.
2. Supabase SQL editor: `select vault.create_secret('<value>', 'toplogger_cron_secret');`

Until both exist the job gets a 401 and nothing is renewed (connections still refresh whenever they are used).

To check that the job ran, in the SQL editor:

```sql
select status_code, content, created from net._http_response order by created desc limit 5;  -- the answers (200 and the counts)
select * from cron.job_run_details order by start_time desc limit 5;                          -- the schedule
```

## 3. Connect your account

Open the TopLogger module in the app and paste a refresh token from a logged-in `app.toplogger.nu` session (browser dev tools > Application > Local Storage, key `tl-auth.refresh.token`). Each refresh token works once, so copy a fresh one for every attempt, and note that using it signs that browser session out of TopLogger.
