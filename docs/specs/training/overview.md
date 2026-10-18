# Training module (TL Training)

Status: in progress. The strength-circuit editor and timer runner are built; everything else below the line "Parked" is design for later and not built. Source: the digitised "Klimax High Performance Training" document (2021, `docs/Klimax High Perfomance Training 2021.docx`). Language: English only.

## Goal

- Digitise the group's training, starting with the part that is simplest and most used: the **strength circuit**.
- Run it on its own, with the phone holder able to use timers later and everyone else just seeing the day's list and marking it done.
- Track progress per person (every climber has their own phone); the group trains together but nothing is shared live.
- Later: the climbing part (relative targets, rope/route picking, TopLogger logging), then facts for achievements.

## What the strength circuit is

A circuit is a short list of slots (fingers, core, strength, fingers, core, strength), repeated for a number of rounds. With four people the group splits in two and swaps halfway to share the space; the app does not model that, it is just the list.

The app only needs the **timer type** of a slot; the exercise itself does not matter. A **profile** ties a timer type to the exercises that fall under it:

| Family | Profile (timer) | Example options |
|---|---|---|
| Fingers | 7 s on / 3 s off × 8 | edge hangs 25 mm, campus deadhangs |
| Fingers | one arm 5 s left / 5 s right, **2 min rest**, again | one-arm edge hang, one-arm sloper |
| Core | 20 / 20 / 20 s | plank (flat, left leg, right leg), deadhang with leg raises |
| Core | 60 s | abs, plank in the rings |
| Strength | untimed | shoulder press, pull-ups, push-ups, ab roller |
| Strength | 5 s efforts, **2 min rest** | front lever, one-arm lock-off, pull-ups ×8 twice |

The 5 s efforts are counted by hand; the timer is the 2 minute rest. Options are plain text for now and become structured only if text proves not to be enough.

## Built so far: a circuit editor and a timer runner

No storage; the circuit lives in memory (it survives moving between the two screens, not a reload).

- **Editor** (`/training`): rounds, and a list of slots. For each slot pick a timer profile (which sets the timer) and one of its exercises; add a slot per family, remove one, reset to the default six. "Start" goes to the runner.
- **Runner** (`/training/run`): the slots in order; tap one to open its timer (start, pause/resume, reset; phase, pass count, countdown) and see its exercise. One timer is open at a time. Untimed slots just show the exercise. No audio, vibration or screen lock handling yet.
- Code: `hub/app/modules/training/` (`plan/` for timers, profiles and the step maths; `useCircuit.ts` for the in-memory circuit; `components/TimerPanel.vue`).

## Next

- Try it at the wall and refine the profiles, options and screens before adding more. Then, in order of need: beep and screen-awake handling, saving circuits and completions.
- Weekly picks move from code to the database (readable by the group, editable by the curator); start from the previous week's circuit and adjust. Mechanical, not a functional change.
- Then, one at a time and each only once the previous is settled: warm-up and stretching, the climbing blocks, timers, facts for achievements.

---

# Parked: design for later

The sections below are the earlier, wider design (sessions made of stretching, strength, warm-up and a climbing block). They are kept because the climbing and architecture parts still apply; the session/block model above them is superseded by the circuit model. Nothing here is built.

## The wider training

A full session was: stretching with a band (training room), the strength circuit (training room), a warm-up (climbing area, often skipped, never conditional on logged routes), the main climbing block, and optional extras (pull-up ladders, a 10-exercise abs circuit) that are loose blocks, not part of sessions. Sessions were independent entries, not a plan with required order.

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

### Shared TopLogger layer (done)

Done: `api.ts`, `domain.ts` and `history.ts` now live in `hub/app/shell/toplogger/` (see `docs/toplogger/data.md`). The original reasoning:

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

## Open questions

1. **Rope number:** the TopLogger module already shows `label` as "Rope <label>" for unnamed routes, and `wall.nameLoc` is the section. Confirm against live Klimax data that `label` is the rope number and that routes on a rope share it.
2. **Circuit options:** check the option lists in the two example circuits against what you actually do.
3. **Warm-up grades:** "low-grade routes" and "easy boulders" have no grade in the source; free text or relative to max?
