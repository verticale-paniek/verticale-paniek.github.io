# TopLogger refresh visibility and control (admin)

Status: proposed; nothing in this document is built. Builds on `docs/toplogger/authentication.md`, which describes the connection layer and the daily `toplogger-refresh` job as they exist today.

## Goal

- Let the admin see whether the scheduled renewal is actually running, and what it did.
- Let the admin trigger a renewal on demand, to test the scheduled path and to recover after an outage.
- Surface the health of everyone's TopLogger connections in one place, without ever exposing a token.

## Why

- The daily job is invisible. If `TOPLOGGER_CRON_SECRET` is missing or wrong, pg_cron gets a 401 and nothing is logged, so the failure only shows up two weeks later when connections expire.
- Today the scheduled path cannot be tested without waiting or editing constants.
- "Whose connection broke, and when?" has no answer except SQL.

## Scope

In scope:
- A run log written by every renewal run (scheduled or manual).
- Admin-only API actions to read stats and to run a renewal now.
- A "TopLogger refresh" section on the existing `/admin` page.

Out of scope:
- Notifying users (push, WhatsApp) that they need to reconnect.
- Per-user retry scheduling or backoff beyond the daily run.
- Any change to the refresh algorithm itself (lease, save-before-use, single-use handling).
- Alerting outside the app. The page is the alert surface.

## Data model

New private table `toplogger_refresh_runs`, one row per run. Same access model as `toplogger_credentials`: RLS on, no policies, privileges revoked from `anon` and `authenticated`; only Edge Functions with the service role touch it.

| Column | Meaning |
|---|---|
| `id` | Primary key (bigint identity) |
| `started_at`, `finished_at` | Run window; `finished_at` is null while running or if the run crashed |
| `trigger` | `cron` or `admin` |
| `mode` | `due` (only connections expiring within the renewal window) or `all` (every connected row; admin only) |
| `due` | How many connections the run selected |
| `renewed` | Exchanged successfully and saved |
| `skipped` | Another instance held the lease, or the row changed meanwhile |
| `reconnect_required` | TopLogger rejected the token, or it had expired; the row is now `reconnect_required` |
| `failed` | Temporary failure (TopLogger down, storage error); retried at the next run |

Contains counts only: no user ids, tokens or error text. Keep the last 90 days (delete older rows at the start of each run).

The per-connection state shown on the page comes from the existing `toplogger_credentials` columns (`status`, `refresh_expires_at`, `updated_at`, `last_error`); nothing new is stored per user.

## Shared renewal code

Move the loop out of `toplogger-refresh/index.ts` into `_shared/toplogger/renewal.ts` as `runRenewal({ trigger, mode })`. It inserts the run row first, renews, then fills in the counts and `finished_at`. Both entry points call it:

- `toplogger-refresh` (pg_cron, secret header): `trigger = 'cron'`, `mode = 'due'`.
- `toplogger`, action `refresh-now` (admin): `trigger = 'admin'`, `mode` from the request.

One implementation means the button tests exactly what the schedule runs. A run row left without `finished_at` for more than a few minutes is displayed as "interrupted".

## API (on the existing `toplogger` function)

Both actions require a verified JWT with `app_metadata.role = 'admin'` (read from the claims, as `admin-users` does); anyone else gets 403. User id and role never come from the request body.

- `refresh-stats` returns:
  - `runs`: the last 10 runs (newest first) with the columns above.
  - `connections`: counts of `connected`, `reconnect_required`, and `connected` rows expiring within the renewal window.
  - `people` (optional, see Open decisions): per person `email`, `status`, `updatedAt`, `refreshExpiresAt`.
- `refresh-now` takes `{ mode: 'due' | 'all' }`, runs `runRenewal` and returns that run's row.
  - Rate limit: one manual run per minute per admin; reject while a run started in the last two minutes is unfinished.
  - `mode: 'all'` renews every connected row regardless of expiry. It rotates every user's token, which is safe (the new pair is saved first) but costs one TopLogger call per connection. The UI confirms before sending it.

## Admin page section

Added to `/admin` below user management:

- **Last run:** "Today 04:00 UTC, scheduled, 3 due, 3 renewed" with how long ago.
- **Warning** when the last cron run is older than 36 hours or there is none: "The daily renewal has not run. Check TOPLOGGER_CRON_SECRET and the Vault secret (`docs/toplogger/setup.md`)." This is how a missing or wrong secret becomes visible.
- **Snapshot:** connected, expiring within 10 days, needs reconnect.
- **Recent runs:** small table of the last 10 (time, trigger, due / renewed / skipped / reconnect / failed).
- **Buttons:** "Run renewal now" (mode `due`) and "Renew all connected" (mode `all`, with confirm). Disabled while a request is in flight; the result row is shown afterwards.
- **People list** (if enabled): email, status, last refreshed, expiry; connections needing a reconnect first.

Reuse the admin page's existing `run()` busy and error handling and the style of `adminCall`; add a `toploggerCall` request type for the two actions.

## Security

- Admin-only, enforced server-side from the JWT claims; hiding the buttons is not the control.
- No tokens, ciphertext or upstream error text in any response or run row.
- The run table holds only counts and times.
- The manual trigger cannot be abused to hammer TopLogger: it is admin-only, rate-limited, and capped at the same 50 connections per run as the schedule.

## Open decisions

1. **Per-person list or counts only.** Recommended: include the per-person list. The admin already sees every member's email, and "whose connection broke?" is the main reason to look. Cost: it reveals who has connected TopLogger. Counts only is the more private default.
2. **Staleness threshold** for the warning: 36 hours (daily schedule plus slack) is the proposal.
3. **Retention** of run rows: 90 days is the proposal; the table stays tiny either way.

## Acceptance checks

- A non-admin calling `refresh-stats` or `refresh-now` gets 403 and nothing changes.
- With a wrong or missing cron secret, the page shows the stale-run warning after 36 hours, and "Run renewal now" still works.
- "Run renewal now" with nothing due records a run with `due = 0` and changes no connection.
- "Renew all connected" moves `updated_at` and `refresh_expires_at` for every connected row, the new tokens work for the next profile request, and the run row counts match.
- A scheduled run and a manual run at the same moment do not lose a rotated token (the lease serializes them; one run reports `skipped`).
- A run killed midway shows as interrupted, not as success.
- No response, run row or log line contains a token, ciphertext or user id.

## Build order

1. Migration for `toplogger_refresh_runs`.
2. `renewal.ts`; switch `toplogger-refresh` to it; tests for the counting logic with a fake store.
3. `refresh-stats` and `refresh-now` with the admin check.
4. The `/admin` section.
5. Update `docs/toplogger/authentication.md` and `docs/toplogger/setup.md` (how to read the page instead of the SQL queries).
