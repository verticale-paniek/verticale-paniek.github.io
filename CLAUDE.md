# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Verticale Paniek is a closed-group, Android-only installable PWA: a **hub** that hosts independent **modules** (TopLogger Plus, fitness, training, games...). `docs/` holds documentation of what exists (`setup.md` for owner setup, `auth.md` for sign-in and the admin, `module-guide.md` for authoring modules, `toplogger/` for the TopLogger module: `authentication.md` for the connection, `data.md` for the screens and API) and `docs/specs/` holds feature design and sparring that is not (fully) built: `specs/refresh-ux/` and `specs/achievements/` (hub-level XP and achievements; the TopLogger Adventure port is part of it). Finished specs move to `docs/specs/archive/` (the original hub and TopLogger design is there as `archive/pwa/`).

Status: phases 1 (foundation) and 2 (Supabase auth, invites, admin page, RLS, keepalive) are deployed and verified. The TopLogger module is built: connection, routes, route detail with logging, and the Top 10. Adventure/achievements are specified (`docs/specs/achievements/`) but not built.

## Commands

The Nuxt app lives in `hub/` (the repo root only holds `.github/`, `docs/` and config), so run these from `hub/`:

```bash
npm run dev          # Nuxt dev server (localhost:3000)
npm run typecheck    # nuxt typecheck (vue-tsc)
npm run lint         # eslint (@nuxt/eslint)
npm test             # vitest run
npx vitest run tests/registry.test.ts   # single test file
npm run generate     # static build to .output/public (what Pages serves)
```

CI (`.github/workflows/ci.yml` on PRs, `deploy.yml` on push to `main`) runs typecheck, lint, test, generate; deploy then publishes `hub/.output/public` to GitHub Pages. `npm install` runs `nuxt prepare` (needed before lint/typecheck). The build needs `SUPABASE_URL` and `SUPABASE_ANON_KEY`: locally from the gitignored `hub/.env` (see `.env.example`), in CI from repo variables. `.github/workflows/supabase.yml` applies migrations and deploys Edge Functions when `hub/supabase/**` changes on `main`. Keepalive: a daily `pg_cron` job (migration `keepalive`) calls `rpc/keepalive` through `pg_net`, backed up by `.github/workflows/keepalive.yml`.

## Architecture

- **Nuxt 4 SPA** (`ssr: false`, `nuxt generate`), source under `hub/app/`. Served at the origin root of the custom domain `https://verticalepaniek.be/` (the old `https://verticale-paniek.github.io/` redirects to it; the domain is a repo Pages setting, see `docs/setup.md`), so `baseURL` stays `/`.
- **Hash routing** (`router.options.hashMode`) because Pages cannot serve deep links. Auth links must use the `token_hash` + `verifyOtp` pattern (`/#/auth/confirm?...`), not Supabase's default hash-token links.
- **PWA**: `@vite-pwa/nuxt`, `registerType: 'prompt'`. `UpdatePrompt.vue` shows the update banner when a new service worker is waiting; hourly update checks. Source maps are intentionally on in production (debugging from phone devtools). `BuildVersion.vue` shows `GITHUB_SHA` (short) and build time from `runtimeConfig.public`.
- **Module registry**: `hub/app/shell/modules.ts` globs `hub/app/modules/*/manifest.ts` (excluding `_template`), `buildRegistry` validates it (id == folder name, no duplicates), and `hub/app/plugins/modules.ts` adds each module's routes to the router under `/<id>/...`. The launcher (`hub/app/pages/index.vue`) lists registered modules. Adding a module needs no shell edits.

- **Auth**: `app/plugins/supabase.ts` creates the client (`detectSessionInUrl: false`) and restores the session before the app mounts; `app/middleware/auth.global.ts` sends signed-out users to `/auth/login`. No emails are sent (the built-in Supabase mailer only reaches org members): the `admin-users` function returns one-time links (`generateLink`) that the admin shares via WhatsApp. They point at `/#/auth/confirm?token_hash=...&type=invite|recovery`, which calls `verifyOtp` then `/auth/set-password`. Admin = `app_metadata.role = 'admin'`. The `/admin` page calls the `admin-users` Edge Function (`hub/supabase/functions/admin-users`, `verify_jwt = false` and checks the caller itself with `getClaims` + the admin role). Anything that needs the service-role key goes in an Edge Function, never the client.

## Module rules

- **Modules never import from each other.** Shared code goes through the shell (`hub/app/shell`, `hub/app/components`, composables). `hub/tests/modules.test.ts` enforces this.
- **Every table gets RLS.** Tables are prefixed with the module id (`toplogger_*`), live in `hub/supabase/migrations/`, enable RLS and have explicit `auth.uid()`-scoped policies per operation.
- **No secrets in the repo.** The Supabase URL and anon key are public by design; the service-role key, TopLogger tokens and cron secrets live only in Supabase / GitHub Actions secrets.

## TopLogger module constraints

Built: connect, status, profile and token refresh (on use, plus a daily `toplogger-refresh` job), routes, route detail (log, repeat, unsend, delete, grade vote, community), and the Top 10. How the connection works: `docs/toplogger/authentication.md`; the screens and API: `docs/toplogger/data.md`. Adventure is not built.

- Refresh tokens are stored server-side only, encrypted at the application layer, in a private table with no client RLS policies. All TopLogger calls go through an authenticated Edge Function that derives the user from the verified JWT, never from a caller-supplied `user_id`.
- Connecting is a one-time paste of the refresh token over HTTPS, validated with TopLogger before anything is stored (a pairing-secret design is archived, not built). Never log tokens or authorization headers; return sanitized errors; do not collect TopLogger passwords or expose an unrestricted GraphQL proxy: the function only sends the documents in `_shared/toplogger/queries.ts`.
- Latency matters for this module: follow the "Latency" section of `docs/toplogger/data.md` (one round trip per screen, cached data first).
- TopLogger refresh semantics (verified 2026-10-11): refresh tokens are single use (rotation), expire 14 days after issue and slide on every exchange; access tokens last 10 minutes. Persist the new pair before using it and serialize refreshes per user. See `docs/toplogger/authentication.md`.
- GitHub disables scheduled workflows after 60 days of repo inactivity, so `pg_cron` in Supabase is the primary keepalive and the Actions ping only a backup.

## Phases

1. Foundation (done). 2. Supabase (auth, invites, RLS, keepalive; done). 3. TopLogger module (done except Adventure). 4. Achievements as a hub feature (`docs/specs/achievements/`), then more modules. Each phase is verified on a real Android phone.
