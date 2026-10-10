# Writing a module

1. Copy `hub/app/modules/_template/` to `hub/app/modules/<id>/`. The folder name is the module id.
2. In `manifest.ts` set `id` (must equal the folder name), `name`, `icon` (one emoji) and `routes`. Route paths are relative; the shell mounts them under `/<id>`. Pages live in the module's `pages/`.
3. Push. The shell discovers `hub/app/modules/*/manifest.ts` automatically (only `_template` is skipped), and the module shows up in the launcher.

## Shell vs module

The **shell** is the framework: sign-in, the account and admin pages, the Supabase client (`useSupabase()`), the current user (`useAuth()`), and the CI that applies migrations and deploys functions. A **module** is a feature on top of that. It stores data through the shell's Supabase client in its own prefixed, RLS-protected tables, and never needs the service-role key. If a module needs privileged server code, it ships its own Edge Function in `hub/supabase/functions/<module-id>-*`.

## Rules

- **Modules never import from each other.** Share things through the shell (`hub/app/shell`, `hub/app/components`, composables). `hub/tests/modules.test.ts` fails if a module reaches into another one.
- **Every table gets RLS.** Tables are prefixed with the module id (`fitness_*`) and created in `hub/supabase/migrations/`. Checklist for each new table:
  - `alter table ... enable row level security;`
  - an explicit policy per operation, scoped by `auth.uid()`; no policy means no access;
  - no `using (true)` unless the data is deliberately readable by the whole group.
- **No secrets in the repo.** The Supabase URL and anon key are public by design; the service-role key, TopLogger tokens and cron secrets are not.
