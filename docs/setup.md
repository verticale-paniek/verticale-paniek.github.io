# Setup

One-time actions for the owner: GitHub, your dev machine and the Supabase project. The code side (scaffold, CI, migrations, Edge Functions) lives in the repo and is deployed by the workflows. TopLogger needs a few extra secrets: see `toplogger/setup.md`.

## 1. GitHub organization and repo

1. Create the organization (github.com/organizations/new, free plan). Name it so the Pages URL is what you want, e.g. `verticale-paniek` gives `https://verticale-paniek.github.io/<repo>/`. Naming the repo `verticale-paniek.github.io` instead gives the clean root URL `https://verticale-paniek.github.io/`; recommended since it is the only app on that origin.
2. Create the repo inside the org, **public** (needed for free Pages), initialised empty (no README), default branch `main`.
3. Invite co-owners to the org (Owners, so more than one person can recover access).
4. Repo Settings > Pages > Source: **GitHub Actions**.
5. Repo Settings > Branches: protect `main` (require PR + passing CI). Optional but cheap; do it once the first deploy works.
6. Decide whether to keep the repo on `main` only or use PRs. For vibe coding with friends, PRs with CI are the safety net before the live site changes.

Decided: org `verticale-paniek`, repo `verticale-paniek.github.io`, so `baseURL` stays `/`.

## 2. Dev environment

Node 22 or newer (the repo is developed on v24). Additionally:

1. Install Git and GitHub CLI (`gh auth login`), clone the repo.
2. Supabase CLI: `npx supabase` works without a global install (`npx supabase login` once before commands that touch the hosted project), or `scoop install supabase`. Docker Desktop is needed **only** for a local Supabase stack; we develop against the hosted project and skip it.
3. In `hub/`, copy `.env.example` to `.env` and fill in the public Supabase URL and anon key (from step 3.2), then `npm install` and `npm run dev`.
4. Phone testing: Chrome on the PC with remote debugging, phone on USB with developer mode and USB debugging on, open `chrome://inspect/#devices`, forward port 3000. This tests the dev server on the real phone (PWA install and service worker need HTTPS or localhost, and port forwarding counts as localhost).
5. Use the deployed Pages URL for real install testing; the service worker only behaves like production there.

## 3. Supabase project

1. supabase.com: sign in with GitHub, create an organization (free) and a project. Pick a region near you (EU). Save the database password in a password manager.
2. Project Settings > API: copy the **Project URL** and **anon (publishable) key**. These are public and go in the repo config. The **service_role key never goes in the repo**.
3. Authentication > Providers > Email: enable, **disable "Allow new users to sign up"**, keep "Confirm email" on.
4. Authentication > URL Configuration: Site URL = the Pages URL; add it (and `http://localhost:3000`) to redirect URLs.
5. Nothing to configure for email: invites and password resets are one-time links the admin shares via WhatsApp (see `specs/pwa/overview.md`, Auth).
6. Create your own user: Authentication > Users > Add user (email + password). Then set yourself admin in the SQL editor:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '<you>';`
7. Account settings > Access Tokens: create a personal access token for CI (migrations and function deploys).
8. GitHub repo > Settings > Secrets and variables > Actions: add
   - secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
   - variables `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
9. Optional: in Authentication, raise the email OTP expiry (default 1 hour, max 24 hours) so shared links stay valid longer. Custom SMTP is not needed: the built-in mailer only reaches org members, and we do not send email.

After this, every push to `main` that touches `hub/` deploys the site (`deploy.yml`), and every push that touches `hub/supabase/` applies migrations and deploys Edge Functions (`supabase.yml`).

## Verify it works

Check these on a real Android phone after the first deploys:

- **Site:** the Pages deploy is green; the app installs; reloading on a deep link works; after a push the update prompt appears; airplane mode still opens the shell.
- **Auth:** an uninvited signup is rejected; an invited user sets their own password; the admin can send a new link and disable a user; user A cannot read user B's rows.
- **Keepalive:** the Supabase project is still active after 8 days or more. A daily `pg_cron` job is the primary keepalive; a scheduled GitHub Actions ping is the backup (GitHub pauses scheduled workflows after 60 days of repo inactivity).
