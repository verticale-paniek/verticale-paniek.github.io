# Setup steps

Actions for the owner (you) vs. things Claude does in the repo. Do them roughly in order; each part is independent enough to pause after.

## 1. GitHub organization and repo (you)

1. Create the organization (github.com/organizations/new, free plan). Name it so the Pages URL is what you want, e.g. `verticale-paniek` gives `https://verticale-paniek.github.io/<repo>/`. Naming the repo `verticale-paniek.github.io` instead gives the clean root URL `https://verticale-paniek.github.io/`; recommended since it is the only app on that origin.
2. Create the repo inside the org, **public** (needed for free Pages), initialised empty (no README), default branch `main`.
3. Invite co-owners to the org (Owners, so more than one person can recover access).
4. Repo Settings > Pages > Source: **GitHub Actions**.
5. Repo Settings > Branches: protect `main` (require PR + passing CI). Optional but cheap; do it after phase 1 works.
6. Decide whether to keep the repo on `main` only or use PRs. For vibe coding with friends, PRs with CI are the safety net before the live site changes.

Decided: org `verticale-paniek`, repo `verticale-paniek.github.io`, so `baseURL` stays `/`.

## 2. Dev environment (you)

Already have Node (v24). Additionally:

1. Install Git and GitHub CLI (`gh auth login`), clone the new repo.
2. Install the Supabase CLI (`scoop install supabase` or `npx supabase`, no global install needed) and Docker Desktop **only if** you want a local Supabase stack. Optional: we can develop against the hosted project and skip Docker.
3. For phone testing: Chrome on PC with remote debugging, phone on USB with developer mode and USB debugging on, open `chrome://inspect/#devices`, forward port 3000. This tests the dev server on the real phone (PWA install and service worker need HTTPS or localhost, and port forwarding counts as localhost).
4. Use the deployed Pages URL for real install testing; the service worker only behaves like production there.

## 3. Foundation in the repo (Claude)

Scaffold Nuxt SPA, hash routing, PWA plugin, shell, two hello modules + `_template`, update prompt, build version display, CI (`ci.yml`) and Pages deploy (`deploy.yml`).

Verify: Pages deploy is green; install on your Android; reload on a deep link works; push a change and the update prompt appears; airplane mode still opens the shell.

## 4. Supabase project (you)

1. supabase.com: sign in with GitHub, create an organization (free) and a project. Pick a region near you (EU). Save the database password in a password manager.
2. Project Settings > API: copy the **Project URL** and **anon (publishable) key**. These are public and go in the repo config. The **service_role key never goes in the repo**.
3. Authentication > Providers > Email: enable, **disable "Allow new users to sign up"**, keep "Confirm email" on.
4. Authentication > URL Configuration: Site URL = the Pages URL; add it (and `http://localhost:3000`) to redirect URLs.
5. Authentication > Email Templates: Claude provides the invite/reset templates using the `token_hash` link format (needed for hash routing).
6. Create your own user: Authentication > Users > Add user (email + password). Then set yourself admin in the SQL editor:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '<you>';`
7. Account settings > Access Tokens: create a personal access token for CI (migrations/functions deploy).
8. GitHub repo > Settings > Secrets and variables > Actions: add
   - secret `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
   - variables `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
9. Later (phase 2b): create a Resend (or similar) account for SMTP and enter it in Authentication > SMTP Settings, because the built-in mailer allows only a few emails per hour.

## 5. Supabase in the repo (Claude)

`supabase init`, migrations folder, RLS-by-default template, admin Edge Functions (invite, reset, disable, list users), shell admin page, login/set-password/forgot-password pages, CI job that applies migrations and deploys functions on `main`.

Verify: uninvited signup is rejected; invited user sets own password; admin can reset and disable; user A cannot read user B's rows.

## 6. Keepalive (Claude, then you check)

`pg_cron` job plus a GitHub Actions scheduled ping as a redundant backup (GitHub pauses scheduled workflows after 60 days of repo inactivity, so the in-Supabase job is primary).

Verify: check the Supabase project is still active after 8+ days.

## 7. TopLogger module

Per `supabase-pwa.md`. Start with manual refresh-token linking. First step for you: obtain a refresh token from a logged-in `app.toplogger.nu` session and note two successive `refresh.expiresAt` values to prove sliding expiry before building the scheduled refresh.
