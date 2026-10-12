# verticale-paniek.github.io

Hub PWA for the Verticale Paniek climbing group, served at https://verticalepaniek.be/.

- `hub/`: the Nuxt app
- `docs/`: documentation (`docs/setup.md` for owner setup, `docs/module-guide.md` explains how to add a module; `docs/toplogger/` explains the TopLogger module) and `docs/specs/` for feature designs
- `.github/workflows/`: CI, GitHub Pages deploy, Supabase deploy, keepalive

## Getting started

You need [Node.js](https://nodejs.org/) 22 or newer and Git.

```bash
git clone https://github.com/verticale-paniek/verticale-paniek.github.io.git
cd verticale-paniek.github.io/hub
cp .env.example .env     # then fill in the two values, see below
npm install
npm run dev              # http://localhost:3000
```

**`.env`** holds `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Both are public (they ship in the site); get them from an owner or from the Supabase dashboard under Project Settings > API (the "publishable" key). `.env` is gitignored. Never put the service-role / secret key in it.

**Signing in:** the app is invite-only and your local copy talks to the **live** Supabase project, there is no separate dev database. Ask an admin for an invite link, then sign in on `localhost:3000` with that account. Be aware that anything you save while developing is real data.

### Everyday commands (run from `hub/`)

| Command | What it does |
|---|---|
| `npm run dev` | dev server with hot reload (the service worker is off in dev) |
| `npm run typecheck` / `npm run lint` / `npm test` | the checks CI runs on every PR |
| `npm run generate` then `npm run preview` | production build, to try the PWA install and update prompt locally |

### Workflow

`main` is protected: work on a branch, open a PR, wait for the `check` job to go green, then squash-merge. Merging to `main` deploys the site. Changes under `hub/supabase/` (migrations, Edge Functions) are applied by the `Supabase` workflow after merge, so you do not need the Supabase CLI or Docker for normal work.

### Testing on a phone

Chrome on the PC: `chrome://inspect/#devices`, connect the phone over USB with USB debugging on, and forward port 3000. The service worker and install prompt only behave like production on the deployed site.
