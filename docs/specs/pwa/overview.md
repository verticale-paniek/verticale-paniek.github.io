# Verticale Paniek hub (PWA)

Status: proposed. Supersedes the single-purpose plan in `supabase-pwa.md`, which becomes the spec for the TopLogger module (credential storage, pairing, refresh lifecycle).

## Goal

A closed-group installable PWA for the climbing group Verticale Paniek. It is a **hub** that hosts independent **modules** (TopLogger Plus, fitness, climbing training, group games, cross-module achievements...). The foundation makes adding a module cheap for vibe-coding developers: copy a template, register it, push, it is live.

## Constraints

- Android phones only; one member has a locked phone, so install must be via the browser (PWA), no sideloading.
- Free hosting: GitHub Pages (static) + Supabase free tier.
- Closed group: no public signup, invitation only.
- Developed in the browser/phone devtools, so the dev loop must be fast and the deployed build easy to inspect (source maps on, visible build version).

## Architecture

```text
GitHub repo --push--> GitHub Actions (build, test, deploy)
                           |
                           v
                     GitHub Pages (static PWA)  <--install-->  phones
                           |
                           | Supabase JS (anon key + user JWT)
                           v
                     Supabase: Auth, Postgres (RLS), Edge Functions, pg_cron
```

- **Shell**: auth gate, module launcher, shared UI kit, update prompt, shared services (Supabase client, current user, settings).
- **Module**: a folder that exports a manifest (`id`, `name`, `icon`, `routes`) and its own pages. Modules never import from each other; shared things go through the shell's services.
- **Data**: each module owns tables prefixed with its id (`toplogger_*`, `fitness_*`), all with RLS by `auth.uid()`. Achievements later become a shell-level table modules write events into.

## Decisions

### Stack
Nuxt (Vue 3, TypeScript) in SPA mode (`ssr: false`, `nuxt generate`), matching the existing mobile app. `@vite-pwa/nuxt` for manifest/service worker, Vitest for tests. Plain static output, no SSR. Modules are Nuxt layers or plain folders under `app/modules/` (decide in phase 1; folders first, layers only if isolation proves needed).

### Routing on GitHub Pages
Pages serves only static files, so deep links like `/toplogger/routes` 404 on reload. Use **hash routing** (`router.options.hashMode: true` in Nuxt, URLs like `/#/toplogger/routes`). It needs no server support, survives reload and install, and is invisible to users in a standalone PWA. (A `404.html` copy of `index.html` is the alternative but returns HTTP 404 and complicates the service worker.) The repo is `verticale-paniek.github.io`, so the site is served at the origin root and `app.baseURL` stays `/`.

Gotcha: Supabase's default email links put tokens in the URL hash, which collides with hash routing. Use the `token_hash` pattern instead (link to `/#/auth/confirm?token_hash=...&type=invite`, then call `verifyOtp`), see Auth.

### Hosting and repo
- GitHub Pages on the free plan requires a **public** repo (private needs a paid plan). That is acceptable: no secrets in the repo. The Supabase URL and anon key are public by design; security is RLS + disabled signup. The service-role key and TopLogger tokens live only in Supabase secrets / GitHub Actions secrets.
- The current repo is `CedricBaetens/TopLoggerPlus`, not ours. Start a **new repo** (e.g. `verticale-paniek`). A GitHub **organization** is free and worthwhile if more than one person should own/admin it and you want `verticale-paniek.github.io` as the URL; a personal repo is fine to start, and repos can be transferred to an org later (Pages URL changes, so re-install of the PWA would be needed: decide before inviting people).

### Keepalive and token refresh
- Supabase free pauses projects after ~1 week of inactivity (the docs say 7 days). Do not rely on GitHub scheduled workflows alone: GitHub **disables scheduled workflows after 60 days without repo activity** in public repos.
- Preferred: **`pg_cron` inside Supabase** calling an Edge Function (or doing a trivial query) on a schedule. Database activity from inside counts as activity only if there is API/DB traffic, so also keep a GitHub Actions cron that pings the REST endpoint as redundancy.
- The TopLogger refresh job is the same scheduled Edge Function (see `supabase-pwa.md`), so it doubles as keepalive.

### Auth
Supabase Auth, email + password, public signups disabled.

- **Invite**: an admin enters an email; an Edge Function (checks the caller has `app_metadata.role = 'admin'`, uses the service-role key) calls `generateLink({ type: 'invite' })`, which creates the user and returns a one-time token **without sending email**. The admin page builds `/#/auth/confirm?token_hash=...&type=invite` and the admin shares it via WhatsApp. The invitee lands on a "set your password" page and chooses their own password. The admin never sees it.
- **Password reset / expired invite**: the admin generates a new link (`generateLink({ type: 'recovery' })`) for the user and shares it the same way. There is no self-service "forgot password" because nothing sends email.
- **Disable/enable**: admin Edge Function sets/clears the user's ban (`ban_duration`) via the admin API; also supports removing a user.
- **Admin role** lives in `app_metadata` (not user-editable), set manually for the first admin via the Supabase dashboard/SQL. An admin page in the shell lists users and exposes invite/new link/disable/delete.
- **No email delivery by design**: Supabase's built-in mailer only reaches addresses of the Supabase organization's members (and ~2 emails/hour), and editing templates requires custom SMTP. Sharing links over WhatsApp avoids needing SMTP. Link lifetime is the project's email OTP expiry (default 1 hour, max 24). Custom SMTP (e.g. Gmail app password, or Resend with a domain) stays an option if self-service reset is wanted later.
- Invite links may open in the browser rather than the installed PWA; that is fine, the user sets the password there, then installs/opens the PWA and logs in.

## Repo layout

The repo root stays minimal (Pages/Actions plumbing, docs); the app lives in `hub/`.

```text
/
  .github/workflows/   ci.yml, deploy.yml (keepalive.yml arrives with Supabase)
  docs/                specs, module guide
  hub/                 the Nuxt project (run npm commands here)
    app/               Nuxt srcDir
      shell/           module registry, types
      layouts/ components/ pages/ plugins/
      modules/         hello-a, hello-b, _template (copy to start a module)
    public/            app icons, made from docs/branding/logo-source.png
    tests/             Vitest
    supabase/          (phase 2) migrations/, functions/
```

## Delivery phases

Each phase ends deployed and verified on a real phone.

1. **Foundation**: shell + two hello-world modules + manifest/service worker + hash routing + in-app update prompt. CI (typecheck, lint, test, build) on PRs; deploy to Pages on `main`. Build version shown in the UI. Verify: install on Android, works offline for shell, update prompt fires after a new deploy, reload on a deep link works.
2. **Supabase**: project, migrations in repo applied via CLI in CI, auth with signups disabled, invite flow, RLS, one hello module storing per-user data. Keepalive (pg_cron + Actions ping). Verify: uninvited signup fails, user A cannot read user B.
3. **TopLogger module**: replaces a hello module. Starts with manual refresh-token linking, then the scheduled refresh job per `supabase-pwa.md`. Verify sliding-expiry assumptions first.
4. **Later**: achievements as a shell-level service, companion login app, more modules.

## Module authoring guide

Written in `../../module-guide.md`: copy `_template`, rename, add manifest, add migration prefix, done. Include a checklist for RLS on every new table.

## Open questions

Decided: Nuxt/Vue, GitHub organization `verticale-paniek` with repo `verticale-paniek.github.io` (site at `https://verticale-paniek.github.io/`), email+password auth with admin invites, modules as plain folders.

- Custom domain later? (avoids URL changes entirely)

Step-by-step setup actions are in `../../setup.md`.
