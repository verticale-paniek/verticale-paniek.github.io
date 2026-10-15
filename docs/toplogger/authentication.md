# TopLogger authentication

How the app connects to a user's TopLogger account and keeps that connection alive. This describes what exists; keep it in step with the code. The data screens and the rest of the API are in `data.md`. The original design is archived in `../specs/archive/pwa/supabase-pwa.md`; owner setup (secrets, cron) is in `setup.md`.

Covered: connect, status, disconnect, token refresh (on use and daily), and the profile read. The data screens (routes, history, logging ascents) are in `data.md`.

## What we know about TopLogger's API

Verified against the live service on 2026-10-11 (re-check if something starts failing; the API is undocumented):

- **Endpoint:** one GraphQL endpoint, `POST https://app.toplogger.nu/graphql`, with `Authorization: Bearer <access token>`.
- **Tokens:** the mutation `authSigninRefreshToken(refreshToken)` returns `{ access, refresh }`, each with `token` and `expiresAt`.
  - The **access token lasts 10 minutes**.
  - The **refresh token lasts 14 days from issue** and **slides**: every exchange issues a new one, so using it at least once every 14 days keeps a connection alive indefinitely.
  - Refresh tokens are **single use**. The second exchange of the same token fails; the new token from the first exchange works. Concurrency and crash handling in this app follow from that.
- **Errors:** an unauthenticated or expired call returns HTTP 200 with `errors[].extensions.code = "UNAUTHENTICATED"` and `data: null`, so the status code alone is not enough. A malformed refresh token returns 400 `BAD_USER_INPUT`.
- **CORS:** the API only allows the origin `https://app.toplogger.nu`. A browser call from our site fails at the preflight (tested from the PWA), so every call goes through an Edge Function. The old Android app avoided this with native HTTP, which a PWA does not have.
- **Rate limit:** responses carry `x-ratelimit-limit: 5000` and `x-ratelimit-reset: 60`. Generous for our use.
- **Latency:** about 100 to 250 ms per call from an Edge Function.
- **Where the first token comes from:** a logged-in `app.toplogger.nu` session stores it in local storage as `tl-auth.refresh.token`. Using it burns it, so copying it into our app signs that browser session out.

## The idea in one paragraph

TopLogger has no public API for third parties. A logged-in user holds a **refresh token**; exchanging it returns a short-lived **access token** (10 minutes) plus a **new refresh token** (valid 14 days; the old one dies at once). Our server keeps each user's token pair, encrypted, and does every TopLogger call on their behalf. The phone only ever talks to our Supabase Edge Function and never sees a TopLogger token after the first paste.

```text
Phone (PWA)                 Supabase                                   TopLogger
-----------                 --------                                   ---------
signed in as you  -- JWT -> Edge Function "toplogger"
                              | reads your row (service role)
                              | decrypts with TOPLOGGER_ENCRYPTION_KEY
                              | refreshes if the access token is stale -> authSigninRefreshToken
                              | calls GraphQL with the access token ----> userMe, climbs, ...
              <- result ----  |
                              v
                       table toplogger_credentials (ciphertext only)

pg_cron (daily) -- secret header -> Edge Function "toplogger-refresh" -> renews idle connections
```

## Why a server at all

Browsers cannot call TopLogger directly (CORS, see above), and a server can renew tokens while the app is closed. So everything TopLogger goes through an Edge Function.

## What is in the database

One table, `toplogger_credentials`, one row per user who connected. Migration: `20261011200000_toplogger_credentials.sql`.

| Column | What it is |
|---|---|
| `user_id` | Your Supabase user id. Primary key; the row is deleted if the user is deleted. |
| `token_ciphertext` | The encrypted token pair (see below). Unreadable without the key. |
| `key_version` | Which key encrypted it. Always `1` today; reserved for key rotation. |
| `refresh_expires_at` | When the refresh token dies. A plain copy, so we can ask "who is about to expire?" without decrypting anything. |
| `status` | `connected`, or `reconnect_required` after TopLogger rejected the token or it expired. |
| `last_error` | A short, sanitized reason for the last failure. Never a token or an upstream message. |
| `version` | A random id replaced on every write. Used so two writers cannot silently overwrite each other (see "Refresh" below). |
| `refresh_lock_until` | A short lease (20 s) that says "someone is refreshing this row right now". |
| `updated_at` | Last connect, refresh or failure. The "Last refreshed" shown in the app. |

Access: row level security is **on with no policies**, and all privileges are revoked from `anon` and `authenticated`. A signed-in user cannot read or write this table, not even their own row, through the Supabase API. Only Edge Functions, using the service-role key, can. The app learns the state only through the `status` action, which returns `connected`, `status`, `refreshExpiresAt`, `lastError` and `updatedAt`, never the ciphertext.

### What is inside the ciphertext

JSON of the whole pair, encrypted:

```json
{ "access":  { "token": "<jwt>", "expiresAt": "..." },
  "refresh": { "token": "<jwt>", "expiresAt": "..." } }
```

Why store the access token too: so a warm request can skip the TopLogger refresh if it is still valid.

## What the encryption key does

`TOPLOGGER_ENCRYPTION_KEY` is a random 32-byte value stored as an **Edge Function secret** (Supabase dashboard, Edge Functions, Secrets). It is the key for AES-256-GCM:

- Before writing a row, the function encrypts the token JSON with the key and a fresh random 12-byte nonce. What lands in the database is `base64(nonce + ciphertext)`.
- The **user id is bound in as "additional authenticated data"**. A ciphertext copied onto another user's row fails to decrypt, and so does any tampered byte (GCM is authenticated).
- To read, the function decrypts with the same key.

What this protects: the database on its own. A database backup, a leaked SQL dump, or someone with SQL-editor access but not the function secrets sees only ciphertext.

What it does not protect: anyone who can read **both** the database and the function secrets, which means you as project owner, and any code deployed as a function. That is inherent to unattended refresh: a server that renews tokens while you sleep has to be able to decrypt them. Truly user-only encryption would rule out the scheduled renewal.

The key lives only in Supabase's secret store and your password manager, never in the repo. **If it is lost, every stored connection becomes unreadable** and each user must paste a new refresh token. Rotating the key is not implemented: it would need the old and new key side by side and a one-off job that re-encrypts every row (the `key_version` column is there for that).

## Secrets inventory

| Secret | Where it lives | Used for |
|---|---|---|
| `TOPLOGGER_ENCRYPTION_KEY` | Edge Function secret | Encrypting and decrypting token pairs |
| `TOPLOGGER_CRON_SECRET` | Edge Function secret **and** Supabase Vault (`toplogger_cron_secret`), same value | Lets pg_cron prove to `toplogger-refresh` that it is the caller |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | Provided to functions automatically | Reading and writing the credentials table |
| Supabase URL and anon key | Public, in the app and CI variables | The PWA talking to Supabase |

## The pieces of code

| Piece | Where | Job |
|---|---|---|
| Table and RLS | `hub/supabase/migrations/20261011200000_toplogger_credentials.sql` | Storage, no client access |
| `toplogger` function | `hub/supabase/functions/toplogger/` | The API the app calls (`status`, `connect`, `disconnect`, `profile`) |
| `toplogger-refresh` function | `hub/supabase/functions/toplogger-refresh/` | Daily renewal, called by pg_cron only |
| Schedule | `hub/supabase/migrations/20261011230000_toplogger_refresh_schedule.sql` | The pg_cron job |
| Shared code | `hub/supabase/functions/_shared/` | `crypto.ts` (AES-GCM), `graphql.ts` (calls and error handling), `store.ts` (table access, refresh logic), `http.ts` (CORS, JWT check, rate limit), `supabase.ts` (service-role client) |
| The module | `hub/app/modules/toplogger/` | The page and `api.ts` (calls the function) |
| Tests | `hub/tests/toplogger-shared.test.ts` | Encryption and response handling |

## The flows

### Connect

1. You paste a refresh token into the page (a password field). The page sends it once to `toplogger` with your Supabase JWT, and clears the field.
2. The function verifies the JWT locally and takes your user id **from the JWT**, never from the request body. It rate-limits attempts (5 per minute).
3. It exchanges the token with TopLogger **first**. A bad or already-used token fails here and nothing is stored, so a failed attempt cannot replace a working connection.
4. On success it encrypts the new pair and upserts your row. The token you pasted is now dead (single use); only the new pair in the database works. This is also why connecting may sign you out of the TopLogger web app if you copied its token.

### A normal request (for example, "load my profile")

1. JWT verified, user id taken from it.
2. If this function instance remembers a still-valid access token for you (in memory only), use it. This is the fast path, no database read.
3. Otherwise read your row, decrypt it. If the stored access token is still valid (more than 60 s left), use it.
4. If it is stale, **refresh** (below), store the new pair, then use the new access token.
5. Call TopLogger. If it answers "unauthenticated" even though the token looked valid, do one forced refresh and retry once (reads only; writes will never be blindly retried).

### Refresh (the careful part)

TopLogger refresh tokens are single use, so a mistake here loses the connection. The rules:

- **One refresher at a time per user**, using a lease. The refresher sets `refresh_lock_until` with a conditional update ("only if nobody holds it, and only if `version` is unchanged"). If the update changes a row, you hold the lease. If not, someone else is refreshing: wait up to 10 s, re-read the row, and use their result.
- **Save before use.** The new pair is written to the database (replacing the row only if `version` is still the one we read) before anything uses the new access token. If that write fails we retry once; if it still fails the old refresh token is already dead, so the user has to reconnect. This is the one unrecoverable case, and it is logged without any token.
- **Never retry with the old token.** After an exchange, the old refresh token is gone.
- **Why `version`:** if you reconnect or disconnect while a refresh is in flight, the refresh's write matches no row and is discarded instead of resurrecting a stale connection.
- **Outcomes:** TopLogger rejects the token, so `status = reconnect_required` and the app shows "Connect again". TopLogger is down or errors, so the lease is released and the stored pair stays, to be tried again later.

### Scheduled renewal

A pg_cron job runs daily at 04:00 (UTC). It calls `toplogger-refresh` through pg_net with `x-cron-secret`, read from Supabase Vault. The function compares it in constant time to `TOPLOGGER_CRON_SECRET` and answers 401 on any mismatch, so users cannot trigger it.

Why a secret at all: Edge Function URLs are public, and this function runs with `verify_jwt = false` because pg_cron has no user session to send a JWT with. Without a check, anyone could trigger renewal runs at will. The secret is a password the scheduler says to the function. It is stored twice because each side needs it: the function holds the expected value (Edge Function secret), and the cron job, which runs inside Postgres, must read the value to send it. Vault is the database's encrypted store for that; the value cannot go in the job's SQL, which lives in the repo and is visible in `cron.job`. Vault being readable in the dashboard is fine, since the owner can see everything anyway; the point is keeping it out of the repo and out of plain SQL. It is lower stakes than the encryption key: a leaked cron secret lets someone trigger renewals but read nothing, while the encryption key together with a database dump would expose tokens.

It renews every connected row whose refresh token expires within 10 days, meaning idle for about 4 days, using the same careful refresh as above (up to 50 per run, 5 at a time). A row that cannot be renewed is simply tried again at the next run, which gives about ten tries before the 14 days run out. It logs only counts. If you use the app regularly this job never has anything to do, because each use already slides the expiry.

### Disconnect

Deletes your row. Other function instances may still hold your access token in memory for up to 10 minutes; after that nothing can call TopLogger for you.

## How things fail, and what you see

| Situation | What happens |
|---|---|
| You paste a token that was already used or is invalid | "TopLogger did not accept that token", nothing stored |
| Idle more than 14 days with no renewal | `reconnect_required`; the page asks you to connect again |
| TopLogger is down | A sanitized "temporarily unavailable" error; stored tokens untouched; the renewal job retries daily |
| Two requests hit an expired token together | One refreshes under the lease; the other waits and reuses the result |
| Encryption key missing or wrong | Reads fail with a generic error; nothing is returned or logged about the key |
| The function crashes between TopLogger's answer and our database write | The connection is lost (the old token is dead); reconnect |

## Looking at it yourself

Safe things to run in the Supabase SQL editor (these never show tokens, only the ciphertext length):

```sql
select user_id, status, refresh_expires_at, updated_at, last_error, refresh_lock_until,
       length(token_ciphertext) as ciphertext_length
from toplogger_credentials;

select * from cron.job where jobname = 'toplogger-refresh';
select * from cron.job_run_details order by start_time desc limit 5;
select status_code, content, created from net._http_response order by created desc limit 5;
```

## Known limits

- Connecting is a manual paste of the refresh token. The one-time pairing secret and the connector apps (Android WebView, Windows helper) in the archived design are not built.
- Rate limits and the access-token cache are per function instance (best effort).
- No key rotation yet.
- TopLogger's API is undocumented and may change; there is a reconnect path, not a fix, for that.
- Whether TopLogger caps total session age or revokes sessions independently is only observable over time.
