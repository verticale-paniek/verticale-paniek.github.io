# Achievements and adventure (hub-level)

Status: proposed; nothing in this document is built. This replaces "slice 4: port Adventure" from the TopLogger module plan. The original app's Adventure was a device-local, TopLogger-only feature; we are making it a hub feature that any module can feed, backed by the database.

## Goal

- Give the group one shared sense of progress: XP, a level, and achievements, across everything the hub does (TopLogger now, fitness, training, games later).
- Let a module contribute to it without importing another module or knowing how progress is computed.
- Keep the data in the database, so it survives a reinstall, follows the climber across devices, and can later be shown to the rest of the group.

## What the original app did (the baseline)

From `TopLoggerPlus/Mobile/app/utils/adventure.ts` (Android app, device-local, owned by Cedric):

- XP only for sends **logged in the app**: Redpoint 100, Flash 125, Onsight 150. Flat, whatever the grade. Attempts, repeats and grade votes earn nothing.
- One reward **per route** (per gym and route). A second send of the same route earns nothing.
- **Unsend removes the reward**, and deleting the last top of a route does too. So XP, level and achievements can go down.
- Level = 1 + floor(XP / 500). Progress bar towards the next level.
- Achievements are open-ended **milestone chains** on six counters: sends, redpoints, flashes, onsights, XP, gyms. Targets go 1, 5, 10, 25, 50, then double (100, 200, ...). The first of a chain has a name ("First Flash"), the rest are "N Flashes".
- Progress is **derived** from the reward list every time; nothing is stored about "unlocked". A toast shows XP gained, a level-up and new achievements right after a write.
- Storage: localStorage per TopLogger account. Reset button. Not shared, not backed up.

## Why change it

- **Local-only** loses everything on a cleared browser and never reaches the group.
- **Only counting what is logged in the app** means a climber who also logs in the official app has a wrong level, and a first-time user starts at zero with 100+ real sends.
- **Flat XP** rewards a 5a redpoint like a 7a one.
- **TopLogger-only** conflicts with the hub idea (fitness, training and games should count too).

## Scope

In scope:

- A shell-level data model and service that modules write facts into.
- XP, levels and achievements derived from those facts, with definitions contributed by modules.
- A shell page for the climber's own progress, and the "you earned something" notice after a write.
- TopLogger as the first source, wired through the Edge Function.

Out of scope (for the first cut; see Later):

- Leaderboards or looking at other climbers' progress.
- Push notifications.
- Hand-awarded achievements (an admin giving a badge).
- Any change to how TopLogger data is fetched.

## Core idea: facts, not events

A module reports **facts**: "this user currently has this thing". A fact has a stable key, so reporting it twice changes nothing, and removing it undoes it.

| | Event ("user topped route R") | Fact ("user has topped route R as a flash") |
|---|---|---|
| Report twice | counts twice unless de-duplicated | no effect |
| Unsend | needs a compensating event | delete the fact |
| Rules change later | history is baked in | recompute from the facts |
| Recover from drift | impossible | re-derive facts from the source (TopLogger) and reconcile |

XP, level and achievements are **derived** from the current set of facts and never stored as authoritative numbers (same as the original app, and it keeps rule changes cheap). The one exception is the question of permanent unlocks, below.

## Data model

One shared table owned by the shell (not by a module, so no module prefix):

```sql
create table public.achievement_facts (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  module      text        not null,            -- 'toplogger', 'fitness', ...
  fact_key    text        not null,            -- stable and unique within the module, e.g. 'send:<gymId>:<routeId>'
  kind        text        not null,            -- what it is, e.g. 'send'
  data        jsonb       not null default '{}', -- what the rules need, e.g. { "tickType": 2, "grade": 650, "gymId": "7" }
  occurred_at timestamptz not null,            -- when it happened (for streaks and history), not when it was written
  updated_at  timestamptz not null default now(),
  primary key (user_id, module, fact_key)
);
```

- RLS on. `select` for the owner (`auth.uid() = user_id`). **No client insert/update/delete policy** for modules whose facts come from the server (TopLogger); see Write path.
- `data` is small, validated by the writer. Rules read from it; they never reach into module tables.
- Size: tens of thousands of rows at most for this group. No partitioning, one index on `(user_id, module, kind)`.

### Permanent unlocks (decision needed)

If achievements are only derived, unsending a route can take an earned achievement away. That is the original behavior, but it feels harsh and makes "unlocked on" impossible. The alternative:

```sql
create table public.achievement_unlocks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  achievement text not null,                   -- e.g. 'toplogger:flashes:5'
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement)
);
```

Written once when a derived achievement first becomes true and never removed. XP and level stay derived. Recommendation: **permanent unlocks**, so badges are trophies, while XP follows reality. It also gives the notice a precise "newly unlocked" signal.

## Write path

The write path is part of the trust model. Facts can be fabricated by whoever may write them, so who may write decides how much the numbers mean.

**TopLogger facts are written by the Edge Function**, with the service role, from what TopLogger just answered:

- `logAscent` / `unsend` / `deleteLog` already receive the route's new `ClimbUser` from TopLogger. After a successful write the function upserts or deletes the `send` fact for that route and returns the XP/unlock delta with the response (the phone shows it; it computed nothing).
- The function can also **reconcile** from the history call: facts for every topped route in a window, so sends made in the official app count, and a first-time user starts with their real level. Reconciling is idempotent because facts are keyed.
- No client write policy exists for these facts, so a modified client cannot give itself XP for TopLogger.

**Other modules** (fitness, games) have no trusted server step. Two options, decide when the first one needs it:

1. A `record_fact` RPC (security definer) that checks `module` against an allowlist and validates `data` per kind, callable by any signed-in user for their own `user_id`. Trusting the group is acceptable here.
2. Per-module Edge Function, like TopLogger.

## Rules and definitions

Definitions live in code, not in the database, and are contributed per module:

```ts
// in a module's manifest (shape, not final)
achievements: {
  xp: (fact) => number,                       // XP one fact is worth (0 = none)
  chains: [{ id, name, count: (facts) => number, unit: 'Sends', first: 'First Send' }],
  once: [{ id, name, description, test: (facts) => boolean }],   // one-off badges
}
```

- The **shell** owns the level curve and the chain targets (1, 5, 10, 25, 50, then doubling), the same for every module, so a new module gets sensible progression for free.
- A module only says what its facts are worth and what to count. It never reads another module's facts. Cross-module achievements ("climb and train in the same week") live in the shell's own definitions, which are allowed to read all facts.
- Derivation is a pure function `progress(facts, definitions) -> { xp, level, chains, unlocked }`, unit-tested like the original `progress()` (its tests port directly).

Import boundary: a module's definitions may import from its own folder and the shell, never from another module. `tests/modules.test.ts` keeps enforcing that.

## Functional decisions to make

These are the "whole redesign" questions. Each has a recommendation, but they are yours.

1. **What earns XP in TopLogger?** Original: sends logged in the app, once per route, flat. Options: (a) keep; (b) every topped route in TopLogger (including the official app), once per route; (c) as (b) plus repeats at a reduced rate. Recommendation: **(b)**, reconciled from history, so the level is true from day one.
2. **Flat or grade-weighted XP?** Recommendation: weight by grade, e.g. base by style (Redpoint 100, Flash 125, Onsight 150) times a factor that grows with the French grade, so a 7a means more than a 5a. Needs a concrete curve (open).
3. **History depth.** The Top 10 reads 180 days. A real level needs all-time. The history call is a single query, so an all-time reconcile on first connect is one larger call (measure it). Decide the cutoff.
4. **Permanent unlocks?** See above. Recommendation: yes.
5. **Are chains enough?** Original: counters only. Candidates: streaks (weeks climbed in a row), variety (distinct gyms, grades, walls), firsts (first 6c, first 7a), seasonal. Recommendation: keep chains, add a handful of one-offs and one cross-module badge so the cross-module idea is real from the start.
6. **Social.** Seeing the group's levels needs display names (there is no profile table today) and an aggregate the client may read without reading anyone's facts. Recommendation: not in the first cut; design so it is possible (see Later).
7. **Reset.** The original had a reset button. With server-derived facts it would only hide data. Recommendation: no reset; admin can delete a user's facts with SQL if ever needed.

## UI

- A shell page `/achievements` (linked from the launcher and account page): level, XP bar, chains with progress, unlocked list. Works for any module's definitions.
- The **notice** after a write, shown by the shell (a small toast host), driven by the delta returned from the Edge Function: "+125 XP, Level 4, Achievement: 25 Sends". The TopLogger route screen needs no Adventure code of its own.
- The launcher can show the level next to the avatar later; not needed first.

## Security

- RLS on both tables; owner-only `select`; writes for server-written modules go through the service role only.
- Facts carry no TopLogger tokens or personal data beyond ids the user already has in their own data.
- A fact written by a client for itself (non-TopLogger modules) can be fabricated by that client. Accepted for a closed group; the TopLogger path avoids it because it is the one place numbers could matter for bragging rights.
- Rate limit the write paths the same way the function does today.

## Phasing

1. **Shell core**: migration (`achievement_facts`, optionally `achievement_unlocks`), the pure `progress()` and its tests, the shell service and `/achievements` page. No module wired.
2. **TopLogger source**: Edge Function writes facts on `logAscent`/`unsend`/`deleteLog`, returns the delta; the shell toast shows it. Adventure reaches parity with the original, minus the device-local storage.
3. **Reconcile**: derive facts from TopLogger history, so past sends count. Includes the history-depth decision.
4. **Redesign pieces** chosen above (grade weighting, new badges, cross-module).
5. **Later**: group view and leaderboard (needs `profiles` and an aggregate view), second module as a source, admin-granted badges.

## Test plan

- Unit: `progress()` (ported from the original tests: rewards, duplicates, levels, chains growing, newly-unlocked, undo), fact upsert/delete idempotency, definitions merge across modules.
- Edge Function: with a fake TopLogger as in `tests/toplogger-climb.test.ts`: a send creates a fact once, repeating it changes nothing, unsend deletes it, the delta matches `progress()` before and after.
- Database: RLS checked by hand against the hosted project (owner reads own facts only; a client cannot insert a `toplogger` fact).
- Manual on a phone: log, unsend, reload on a second device, same level.

## Open questions

- The grade-weight curve for XP (decision 2).
- All-time history cost and cutoff (decision 3).
- Whether unlock notices should also be visible in the launcher.
- Exact shape of the module `achievements` contribution; it should be settled with the second module, not guessed now.
