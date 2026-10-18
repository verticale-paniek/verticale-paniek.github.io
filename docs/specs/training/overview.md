# Training module (TL Training)

Status: proposed; nothing in this document is built. This is the digitised version of the "Klimax High Performance Training" plan (2021, source: `docs/Klimax High Perfomance Training 2021.docx`), run as a hub module next to TopLogger Plus. Language: English only.

## Goal

- Follow a 9-session training period in the app: a guided strength part (exercise list; timers later), and a climbing part that picks routes, checks ascents off and logs them in TopLogger.
- Run a whole session or just one block (last time the group did "a circuit and a half"). Composing your own session is not part of the UX; sessions and blocks are fixed in code.
- Track progress per person. A group trains together, but every climber has their own phone and their own progress.
- Report what happened (block and session completed) as facts the achievements system can consume later, without the module knowing how achievements work.

## What the training is

Session skeleton, always in this order:

1. **Stretching** (band). Always happens. Training room.
2. **Strength** (training room): the "Trainingskot", 6 exercises, 2 rounds.
3. **Warm-up** (climbing area): part of the session; sometimes skipped.
4. **Main** (climbing area): the effective training.

**Extras** (pull-ups, abs circuit) are not part of the sessions. They are loose blocks you can pick when you "run one block". They are less structured than strength blocks (a timed pull-up ladder, a 10-exercise circuit), so how much they shape the design is still open; they start as plain checklist blocks.

Two intensity tiers drive which exercises are chosen. They are only a name and a note in the tool, not behaviour:

- **E (endurance), sessions 1E to 5E**: volume at sub-max grades, double and triple routes, medium ("phase 1") strength.
- **P (performance), sessions 6P to 9P**: max+1 climbing, capitalising on the endurance weeks, "phase 2" strength (shorter, harder, expert).

The point of the endurance blocks is fatigue: train adequate climbing in an exhausted state. **Falling ends your block** (you are spent); your partner then starts theirs. There is no swap in the app. At most a note on the exercise.

## Concepts

```
Session (1E … 9P) ──has ordered──> Block ──is a──> Exercise list | Climb target
```

Sessions are **independent entries**, not steps of a plan: nothing requires doing them in order or all of them, and there is no plan object with its own progress. The 2021 source is an ordered series (endurance first, then performance), so each session carries a tier (E/P) and a number as a *suggested* order, and the list is grouped by a `collection` label (`klimax-2021`). A later period is a new collection. The UX is a list of sessions you can start (a buffet), plus a list of loose blocks. Composing your own session from blocks is the natural next step if we want it, and the block-based model already allows it.

| Concept | Meaning | Example |
|---|---|---|
| **Collection** | A label grouping sessions defined together in code (`klimax-2021`). Only for listing and for tagging progress. | |
| **Session** | An ordered list of blocks with a name, tier and note. | `3E` |
| **Block** | The unit you can run on its own and complete. | "Strength circuit, phase 1", "Pyramid" |
| **Exercise** | One line inside a strength/extra block. Optionally has a timer. | "Edge hangs 25 mm, 7s on/3s off ×8" |
| **Climb target** | A climbing block's requirement, in grades relative to your max. | "4 sets: max −1 + max −3" |

### Blocks

| Block kind | Completion | Notes |
|---|---|---|
| `stretch` | Tap done | Always part of a full session. |
| `strength` | Tap done (per exercise optional) | Exercises with an optional timer. "Completed" is all we record for now (no weights or hang times). |
| `warmup` | Tap done | Part of the session. The finish button never depends on climbed routes: you can log routes in it (same as any climb block) or just tick it. |
| `climb` | Routes chosen and sent | The interesting one; see below. |
| `extra` | Tap done | Loose blocks only (not in sessions): pull-ups, abs circuit. |

A session counts as **completed** when its stretching, strength and main blocks are done. The warm-up is optional (skipping is normal).

### Exercise timers

A timer belongs to an exercise and is optional: the exercise can be done and ticked without ever starting it. **Not in the first cut.** The group uses a separate timer app for the beep today, and exercises are shown as plain text with their prescription ("7s on / 3s off ×8"). Timers are a nice-to-have for later, so the exercise data is structured now (below) and nothing blocks adding them. The idea: one phone starts it and everyone hears it (beep, 7 s, beep, 3 s, ...). Timer shapes needed by the plan:

- Interval: `on` / `off` seconds, N sets (7/3 ×8).
- Hold: single duration, with optional sub-phases (plank 20 s flat, 20 s left leg, 20 s right leg; deadhang 20 s straight, 20 s leg raises, 20 s straight).
- Repeats with rest (one arm 5 s left / 5 s right ×2, 2 min rest between).
- Circuit: exercise per fixed interval (abs: 60 s exercise, 30 s rest, 10 exercises).

All of them reduce to a list of `{ label, seconds, beep }` steps generated from a small config. So an exercise carries an optional structured `timer` config next to its text from day one; the first cut just ignores it. When timers are built: Wake Lock to keep the screen on and Web Audio for the beep (verify on the phone whether audio survives a locked screen).

## Climbing blocks

The climbing side is referential: targets are grades relative to **your max**.

### Your max

Derived from TopLogger, with a manual override:

- **Shown from the Top 10**: the max is the highest grade in your Top 10 (including sub-grades such as 6b+), the same list the TopLogger module already computes with `topTen`. Using the Top 10 keeps the number consistent with what you see in TopLogger Plus and needs no new query.
- **A step is 2 sub-grades** on the app's scale (`FRENCH_GRADES` in the domain code), which is one letter: with a max of 7a, −1 = 6c, −2 = 6b, −3 = 6a, −4 = 5c. With a max of 6c+ (a sub-grade in between), −1 = 6b+. Resolved grades are a guide with wiggle room (for example an easy 6a+ still fits a "6a" slot); the app shows the resolved grade, it does not enforce it.
- A manual override can come later if the derived max feels wrong; not in the first cut.

### Targets are relative by model

Every grade in a climb target is really relative to the climber's max; the 2021 document only printed absolute grades because it was written for one group at one level (the pyramid's "up to max −1" is the clearest hint: its peak 6c is max −1 for that group). So sessions model a grade as one of:

- `{ rel: -1 }`: steps below (negative) or above max on the app's grade scale.
- `{ grade: 'xx' }`: an absolute grade, for the cases that have no sensible relative form (e.g. "5 easy boulders").

Session definitions are written with `rel` wherever the source is a relative idea; the 2021 absolute numbers become the *display of* that relative value for a reference max, not the stored truth. This is a modelling decision only: **the first build steps ignore levels entirely** (see Phasing). Targets are shown as relative text ("max −1 + max −3", "peak: max −1"), and the climber looks at the ropes themselves. Resolving them to absolute grades from the Top 10 max is an improvement on top, and needs no change to the session data.

The 2021 grades were based on a reference max of **7a**, with one step = 2 sub-grades (one letter). That gives the offsets:

| Block | 2021 text | Relative |
|---|---|---|
| Volume by grade | 7A, 6C, 6B, 6A | 0, −1, −2, −3 |
| Max sets | max −1 + max −3 | −1, −3 (6c, 6a) |
| Pyramid | 5b 5c 6a 6b 6c 6b 6a 5c 5b | −5 −4 −3 −2 −1 −2 −3 −4 −5 |
| Up/down | max −4 (5c/6a) | −4 (5c; 6a as the upper end) |
| Stepped sets | max −1, −2, −3, −4 | as written |
| Max+1 | max +1 | +1 |

Pyramid note: with 7a as max, 6c is −1 and 5b is −5, so the pyramid runs −5 −4 −3 −2 −1 −2 −3 −4 −5 (5b, 5c, 6a, 6b, 6c, 6b, 6a, 5c, 5b). The sub-grades in between (5b+, 5c+, ...) are skipped, as in the source.

### Flow of a climb block

1. The target is shown. In the first cut as relative text ("max −1 + max −3"). Once max is available it is **resolved to concrete grades**, e.g. "6B + 5C" (the plan's own example), for every block, including volume and pyramid.
2. The module shows the gym's open ropes: section (wall) and rope number, with the routes on each and your progress. You judge which ropes have routes at the right grades, which fits the gym's grade distribution that you already know. (Automatic rope suggestions come later.)
3. You **tell the app which rope you chose**; it shows the subset of routes on that rope and you **select the routes** you will do. For fatigue work you usually pick routes you have sent before, so you know they are not unusually hard for their grade; the list therefore shows your previous ascents.
4. You climb, and **register each ascent as you go**, one at a time, exactly like any other TopLogger climbing night: pick the route, log the ascent (or a try when you fall). The difference from the TopLogger module is only the UX: it is organised around the block's target and the rope you are on, because training exercises often repeat on the same rope. Each log goes through the existing `logAscent` action. If a block says 3 laps and you fall halfway up the third, that is 2 completed ascents plus a try.
5. The block shows progress against its target as you log (for example 4 of 9 pyramid steps). It completes when the target is satisfied, or you end it early ("block ended", partial result recorded). Falling mid-block is normal.

### Ascents and tick types

Training does not care about the tick type, and TopLogger does not care about training:

- A route logs as TopLogger sees it: an unattempted route sent first go is an onsight/flash, a route already topped is a repeat (a redpoint on an already topped route, as the TopLogger module does today), a failure is a try.
- Three laps of one route in a row are three climbs. The first may be an onsight, the others repeats, the last a try if it failed halfway.
- Training adds no tick-type logic of its own. An ascent is logged with the tick type it actually was: if the first go on a route is the first lap of a set of three and you top it, that is an onsight (or flash) and is logged as one. Whether a flash or onsight is allowed (an unattempted route) is decided by TopLogger's data in the Edge Function, as it is today.
- Ascents are logged one by one while you climb, so the TopLogger function's rule "one write at a time per user, never retried automatically" is no problem; the block UI just disables the log button while a write is in flight and shows the "outcome unknown, check TopLogger" message as the TopLogger module does.
- Because the training block knows which ascent belongs to which slot, a lap of an already-logged route is a new log (a repeat), not a change to the earlier one.

### Block formats seen in the plan

| Format | Target | Notes |
|---|---|---|
| Volume by grade | 20 routes: 2× 7A, 4× 6C, 6× 6B, 8× 6A (then scaled for 10 routes: 1×, 2×, 3×, 4×) | Climb the route fully; falling ends the block. Modelled as relative grades; 2021 values are the display for the reference max. |
| Max sets | 4 sets of max −1 + max −3 | Two-route pair per set. |
| Boulder volume | 30 boulders: 10 yellow + 20 blue (or 10/10) | Hardcoded to Klimax by colour band; see Boulders. |
| Pyramid | 9 routes in a row, 5b 5c 6a 6b 6c 6b 6a 5c 5b, up to max −1 | Peak = max −1, other steps relative to it (−5 to −1). |
| Up/down | 3 sets of 10 min up and down climbing, ~max −4 | A timed block: 10 min timer per set. |
| Colour boulders | 25 boulders, 5 colours × 5 | Boulders. |
| Stepped sets | 3 or 4 sets: max −1, −2, −3, −4 | |
| Max+1 | 3 routes at max +1, may repeat; forced rest at 1/3 and 2/3 | A "rest" step on the rope. |
| Max+1 reversed | Same, climbed top third, then middle, then bottom third | |
| Anti-style | 3 routes max, in a style you are weak in | Free text note. |
| Dynamic boulders | 3 green boulders ×4, skipping more holds each time | Boulders, Klimax. |

### Boulders

Hold colours are difficulty bands per gym. For now, boulder blocks are **hardcoded to Klimax** ("all greens", "5 yellow, 5 blue, 5 red", colours as TopLogger reports them) and made generic only if we need another gym.

## Session data

Exercise ids live in code; the sessions below are the first-cut breakdown from the document. Items in **bold** are decisions or inconsistencies in the source to confirm.

| Session | Date (source) | Strength | Warm-up | Main |
|---|---|---|---|---|
| 1E | 04/11/2021 | Phase 1 | 2 doubles slow/fast (5B & 5C) | 10 routes per person: 1× 7A, 2× 6C, 3× 6B, 4× 6A (full climb; falling = rest and continue; may stop after 2/3 rests) |
| 2E | 12/11/2021 | Phase 1 (shoulder press V1/V2, deadhang) | same | 3 sets max −1 + max −3 |
| 3E | 19/11/2021 | Phase 1 + 1 min crunches | none given | All green boulders (~20), then 5 yellow, 5 blue, 5 red (red replaced by blue if it fails); abs extra |
| 4E | 26/11/2021 | Phase 1 + ring push-ups | none given | 9-route pyramid |
| 5E | 03/12/2021 | Phase 1 + tap holds | 1 double (5A) | 3 sets of 10 min up/down at max −4 (5c/6a); abs extra |
| 6P | 10/12/2021 | Phase 2 | low-grade routes | 3 routes max +1, forced rests at 1/3 and 2/3 |
| 7P | 17/12/2021 | Phase 2 | low-grade routes | Same, reversed (top third, middle, bottom) |
| 8P | 07/01/2022 | Phase 2 (8 pull-ups ×2) | low-grade routes | 3 routes max in anti-style |
| 9P | 14/01/2022 | Phase 2 (box jumps) | ~10 green boulders | 3 green boulders ×4 skipping holds; then max-level projects if time and energy |

Not all of the document's "strength options" appear in the sessions as written; the strength block contents per session (and the phase 1/phase 2 lists) will be transcribed exactly in the build, with this table corrected from you.

Exercise catalogue (strength, from the "Kracht opties"): plank (incl. variations), edge hangs 25 mm, shoulder press, pull-ups, campus deadhangs, hanging leg raises on the ring, ring push-ups, typewriter pull-ups, ab roller, tap-a-hold hangs; phase 2: one-arm edge, plank/front lever on the bar, one-arm sloper, one-arm lock-off at 90°, ring dips, ring plank, campus ladders (hand over hand, one low and one stepping, two hands together).

## Architecture

### Shared TopLogger layer

Both TopLogger Plus and Training need TopLogger. The server side is already shared: one `toplogger` Edge Function, one `POST { action }` endpoint. The **client side** is not: `api.ts` (typed requests and `toploggerCall`), the domain types and helpers (`Route`, `frenchGrade`, ...) and the data composable live inside `app/modules/toplogger/`, and modules may not import each other.

Proposal: move the reusable parts out of the module into the shell, so both modules depend on the shell and not on each other:

- `app/shell/toplogger/api.ts`: request/response types and `toploggerCall` (today's `api.ts`).
- `app/shell/toplogger/domain.ts`: the pure types and helpers (grades, tick-type labels, Top 10, route activeness).
- Possibly a shared connection/gym/routes composable, with the cached snapshot; the TopLogger module keeps its pages, filters and tabs.

TopLogger Plus keeps working unchanged apart from import paths, and `tests/modules.test.ts` keeps enforcing that modules never import each other. If a shared composable proves too entangled with TopLogger Plus's UI state, share only api + domain and give Training a thin composable of its own.

Training needs these existing actions: `status` (is the user connected?), `routes` (current gym routes with your progress), `history` (to derive the max), `logAscent`. It needs no new server code unless batching is added.

### Events to achievements

TopLogger Plus and Training both report what happened and nothing else; neither knows how XP or achievements work. This is exactly the "facts" model of `docs/specs/achievements/overview.md`: a fact has a stable key, so reporting it twice is harmless.

Training reports (into the shell-owned facts table, once it exists):

| Fact key | Meaning |
|---|---|
| `block:<collection>:<session>:<block>` | A block was completed (with `data`: partial or full, climbs done) |
| `session:<collection>:<session>` | A session was completed |

"All 9 sessions done" is not a fact: it is derived by the achievements rules from the session facts.

Training does **not** read TopLogger's facts. It talks to TopLogger through the shared client layer above. The achievements system, not Training, joins the two.

Until the achievements core exists Training keeps its own tables and the facts are added when the shell is ready; the module must not depend on that being built first.

### Data model

Tables prefixed `training_`, RLS on, owner-only policies per operation (as `toplogger_prefs`).

```sql
create table public.training_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  collection  text not null,            -- 'klimax-2021'
  session_id  text,                     -- '1E'; null for a single block run on its own
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create table public.training_block_runs (
  run_id      uuid not null references public.training_runs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  block_id    text not null,
  completed_at timestamptz,
  details     jsonb not null default '{}',  -- rope, chosen routes, ascents logged, partial result
  primary key (run_id, block_id)
);

create table public.training_prefs (       -- user_id pk; max-grade override, preferred gym
  ...
);
```

Session and block definitions are code, not rows, so changing them never needs a migration. Completion is derived from block runs.

### Offline and the group setting

- Sessions work without a connection; progress writes queue to the database when reachable (same cache-first approach as the TopLogger module). Logging ascents to TopLogger needs a connection; if it fails the chosen routes stay on the block so you can retry.
- No live shared sessions in the first cut; when timers arrive, the phone that starts one is just a normal client and needs no sync.

## Phasing

Levels (max, absolute grades) are deliberately **not** part of the first steps; the data model allows them.

1. **Shared TopLogger layer**: move api + domain to the shell, TopLogger Plus on top of it, tests green. No behaviour change.
2. **Sessions, runner and strength**: definitions (all 9 sessions as independent entries, targets modelled relative), session list, session/block screens, exercise text with structured (unused) timer config, stretching/strength/warm-up/extras completion, progress tables. Usable at the wall without any climbing integration.
3. **Climb blocks without levels**: show the relative target, the gym's ropes (section and rope number) and their routes, pick the rope and routes, log each ascent via `logAscent`, track progress against the block's slot count, partial results. The climber judges the grades.
4. **Max and absolute grades**: max from the Top 10, targets resolved to concrete grades, ropes/routes highlighted or filtered by the resolved grades.
5. **Facts**: publish block and session facts once the achievements core exists; training achievements defined in the module.
6. **Later**: exercise timers with beep, rope suggestions from the grade distribution, other gyms, a second collection, a manual max override.

## Open questions

Settled: the 2021 grades are based on a reference max of 7a with one step = one letter (2 sub-grades), so they map to clean offsets (table above); targets are modelled relative to max and shown absolute only once max exists (not in the first steps); max comes from the Top 10 including sub-grades; ascents are logged one at a time; timers come later.

1. **Rope number:** the TopLogger module already shows `label` as "Rope <label>" for routes without a name, and `wall.nameLoc` is the section. Confirm against live Klimax data in the build phase that `label` really is the rope number and that routes on the same rope share it.
2. **Strength contents per session:** I transcribed them from the exercise lists; please check them when we get to the session data.
3. **Warm-up grades:** "low-grade routes" and "easy boulders" have no concrete grade in the source; show them as free text, or give them a max-relative default?
