# TopLogger data screens and API

What the TopLogger module shows and how the `toplogger` Edge Function serves it. This describes what exists; keep it in step with `hub/app/modules/toplogger/` and `hub/supabase/functions/`. How the connection and token refresh work is in `authentication.md`. Not built yet: Adventure and achievements, designed in `../specs/achievements/overview.md`.

## Screens

The module has a bottom tab bar (`/toplogger`):

| Screen | Path | What it shows |
|---|---|---|
| Routes | `/toplogger` | Every route at the selected gym with your progress; All / To do / Done, search, filters (grade, hold colour, status, walls). Klimax defaults to sectors 1 to 7. |
| Top 10 | `/toplogger/top` | Your best ascents in the last 60, 120 or 180 days, scored as grade (redpoint), +10 (flash) or +15 (onsight), with days left and the average. |
| Route | `/toplogger/route?id=...` | One route: log Onsight / Flash / Redpoint, Try, Repeat, Unsend, your log with delete, a five-grade vote, route facts, your ascents, community votes, ratings and toppers. |
| Account | `/toplogger/account` | Connect and disconnect. |

## The API shape

One Edge Function, one endpoint: `POST { action, ...params }` with the caller's Supabase JWT. The phone never sends query text. Every GraphQL document is in `_shared/toplogger/queries.ts`, and each action is a function in `ops.ts`, `climb.ts` or `history.ts` that takes a `Call` already bound to the caller's TopLogger access token.

| Action | Does | Upstream |
|---|---|---|
| `status`, `connect`, `disconnect`, `profile` | Connection state and lifecycle (see `authentication.md`). | `userMe` |
| `routes` | Home payload in one round trip: profile, the chosen gym (the requested one if you have it, else your home gym) and its routes with your progress. | `userMe` (cached), `climbs` (paged) |
| `routeDetail` | One route plus your logs plus community data, fetched in parallel. Logs or community may come back `null` without failing the screen. | `climb`, `climbLogs`, `climb` stats, `climbUsers` (toppers) |
| `history` | The Top 10 data in one call (below). | `climbDaysPaginated` |
| `logAscent` | Try (0), redpoint (1), flash (2), onsight (3). Returns your new progress and refreshed logs. | `climb`, then `climbUserLog` |
| `unsend` | Removes sends and generated attempts, keeps genuine tries. | `climbLogs`, then `climbUserDeleteLogs` |
| `deleteLog` | Deletes one log, only if TopLogger currently lists it for you and that route. | `climbLogs`, then `climbUserDeleteLogs` |
| `vote` | Your grade for a route; only the grades on the app's scale are accepted. | `climbUserOpinion` |

The TopLogger user id is never taken from the request; the function looks up your profile with your own token. Gym and route ids are validated as plain identifiers before they reach TopLogger.

## Top 10 history: one call

`history` runs a single `climbDaysPaginated` query filtered to the gym: your session days in the window, each with `climbUserDays { tickType climb { ... } }`. The nested `climb` carries the route's details, so routes that have left the wall need no lookup. Each topped route-day becomes one log in the shape the scoring code (`topTen` in `utils/domain.ts`) already uses. A whole history is one page for a normal climber (the API allows 100 days a page).

Verified against live data on 2026-10-15: for three session days, the tick types from `climbUserDays` matched the per-day `climbLogs` exactly, and the nested limit does not truncate. Not yet checked: a day with a repeat. If the Top 10 ever disagrees with the official app, compare a repeat day first.

How it got here: the original 2023 app used a REST endpoint (`/v1/ascends.json`) that returned all ascents in one call; that API is gone (the host answers 200 with an empty body). The first GraphQL port needed one `climbLogs` call per session day. `climbLogs` has no date-range argument, which is why the days query is the way to get the whole history in one call.

## What the phone keeps and when it fetches

Everything is cached in `localStorage`, scoped by hub account (so one shared phone never mixes users), as complete snapshots: profile, selected gym, routes per gym, Top 10 history and archived routes per gym, the Top 10 window. Only non-secret data is cached; TopLogger tokens never reach the browser.

- **Routes and Top 10 refetch when you enter the module** (from the launcher or a cold start), on the refresh button, on switching gym, and after connecting or disconnecting. Moving between the module's own tabs does not refetch, and neither does coming back from a route.
- **A route screen** fetches its own data every time you open it.
- **After a log, unsend or delete** the route's progress is updated everywhere at once, and the next visit to the Top 10 refetches.
- Filters live in memory while the app is open, so they survive opening a route and coming back. They are not saved.
- A cached snapshot shows immediately; the fresh answer replaces it. If a refresh fails, the cached data stays on screen with the error.

Preferences (selected gym, Top 10 window) are also in the database, table `toplogger_prefs` (one row per user, owner-only RLS), so they follow you across devices. The device copy makes the app load instantly and still work offline; if the table is unreachable the app just uses the device copy.

## Writes

- One write at a time per user (per function instance), so a double tap cannot log twice.
- A write is only retried when TopLogger rejected the access token (nothing was executed). If a write fails any other way, the message says the outcome is unknown and to check TopLogger before trying again. It is never retried automatically.
- Rules come from TopLogger's data, not the phone's: before a log the function re-reads the route and applies the first-try rules (flash and onsight need an unattempted route) and the lead/toprope setting.
- The ascent date is the phone's local day, accepted only within about a day and a half of the server clock.
- Unsend and delete read the logs first, so they can only touch logs that exist for you on that route.

## Latency

Every call goes phone, Edge Function, TopLogger and back, so the function stays thin. Measured on 2026-10-10 from a desktop (not a phone): a direct Supabase REST call about 0.23 s, a warm Edge Function call 0.33 to 0.47 s, a CORS preflight about 0.28 s. The function layer is cheap (0.1 to 0.2 s); the cost is the number of sequential round trips and cold starts. What the code does about it:

- **One round trip per screen**: `routes`, `routeDetail` and `history` fetch in parallel on the server and return one response. Writes return the refreshed logs too.
- **CORS preflight cached** (`Access-Control-Max-Age: 7200`).
- **JWT verified locally** with `getClaims` (cached signing keys) instead of asking the auth service on every request. Role changes and bans therefore apply when the user's access token next refreshes (up to an hour).
- **Per-instance memory**: the decrypted access token and your TopLogger profile (10 minutes) are cached in the function instance, so warm calls skip the credential read, the decrypt and the profile lookup. This is disposable: it disappears on a cold start and is never the only copy. Nothing in it is logged or returned.
- **Show cached data first**, refresh in the background (above). This matters more than any server tuning, and it makes the module usable on a weak connection in a climbing hall.
- **Same region as the database**, few imports, to keep cold starts short. Supabase does not document how long an idle instance stays warm; the first call after a long gap can be noticeably slower.
- **Direct browser-to-TopLogger calls do not work** (tested 2026-10-10): `app.toplogger.nu/graphql` only allows the origin `https://app.toplogger.nu`. That is why all calls go through the function. Re-test if TopLogger changes its CORS policy.

## Security rules

- Credential rows have no client policy at all; only the function (service role) touches them. All TopLogger access goes through the function, which takes the user from the verified JWT.
- Never log tokens or authorization headers; errors are sanitized (fixed messages, never upstream bodies). No TopLogger passwords are collected, and there is no general GraphQL proxy: only the documents in `queries.ts` can be sent, with validated variables.
- Rate limits (per function instance, best effort): 60 requests a minute per user, 5 connect attempts a minute. Pagination is bounded (100 per page, at most 50 pages), responses are validated before they are used, and an incomplete answer fails the call instead of producing partial data.
- Module tables have RLS with an `auth.uid()` policy per operation (`toplogger_prefs`); `toplogger_credentials` has none for clients on purpose.

## Known limits

- TopLogger's API is undocumented. A schema change shows up as an API error on the affected screen; `queries.ts` is the only place to fix it.
- This integration is private use by a closed group. That does not establish that TopLogger authorizes it; check their terms and API limits before widening access.
- Two things only improve over time: whether TopLogger caps total session age (see `authentication.md`), and how the repeat-day behavior of `history` looks in practice.
