# Authentication and admin

How people get into the hub. This describes what exists; keep it in step with `hub/app/plugins/supabase.ts`, `hub/app/middleware/auth.global.ts`, the `/auth/*` and `/admin` pages and the `admin-users` Edge Function. Owner setup (the Supabase project, the first admin) is in `setup.md`. The original design discussion is archived in `specs/archive/pwa/overview.md`.

## The rules

- Supabase Auth with **email + password**. **Public signup is disabled**; nobody can create an account except through an admin.
- **No email is ever sent.** Supabase's built-in mailer only reaches members of the Supabase organization and is rate limited, and templates cannot be edited without custom SMTP. Instead the admin gets a one-time link and shares it over WhatsApp.
- **Admin** is `app_metadata.role = 'admin'`. It lives in `app_metadata`, which users cannot edit themselves. The first admin is set by SQL (see `setup.md`).
- Anything that needs the service-role key runs in an Edge Function, never in the browser.

## Why links use `token_hash`

The site uses hash routing (`/#/...`), because GitHub Pages cannot serve deep links. Supabase's default email links put their tokens in the URL hash too, which collides with the router. So our links look like `/#/auth/confirm?token_hash=...&type=invite` and the page calls `verifyOtp` itself. `detectSessionInUrl` is off for the same reason.

## Flows

**Invite.** On `/admin` the admin enters an email. The `admin-users` function (it checks the caller itself: JWT via `getClaims`, then the admin role; `verify_jwt` is off for it) calls `generateLink({ type: 'invite' })`. That creates the user and returns a one-time token without sending anything. The page builds the link; the admin pastes it into WhatsApp. The invitee opens it, lands on "set your password", chooses their own password and is signed in. The admin never sees it.

**Forgot password or expired invite.** There is no self-service reset. The admin generates a new link for the user (`type: 'recovery'`) and shares it the same way.

**Disable, enable, delete.** The admin page can ban a user (`set-banned`, which sets and clears `ban_duration`) or delete them. Deleting a user also deletes their rows that reference `auth.users` (every module table is created with `on delete cascade`), including TopLogger credentials.

**Signing in.** `/auth/login` with email and password. `app/plugins/supabase.ts` restores the session before the app mounts, and `auth.global.ts` sends signed-out users to the login page.

## Things to know

- A link lasts as long as the project's email OTP expiry (default 1 hour, maximum 24). Raise it in Supabase if links are often opened late.
- Invite links may open in the browser instead of the installed app. That is fine: the password is set there; then open the installed app and sign in.
- A ban or role change takes effect when the user's access token next refreshes (up to an hour), because the Edge Functions verify the JWT locally (see the Latency section in `toplogger/data.md`).
- Link generation, ban and delete are the only places the service-role key is used for users. Never log the links; they are bearer credentials until used.

## Managing admins (SQL editor)

There is no UI for roles; use the Supabase SQL editor.

List the admins:

```sql
select email, raw_app_meta_data->>'role' as role
from auth.users
where raw_app_meta_data->>'role' = 'admin';
```

Make a user admin (also the way to fix the first admin, see `setup.md`):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
where email = '<email>';
```

Remove admin:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = '<email>';
```

The user must sign out and in again (or wait for the token refresh) before the change shows up, see the notes above.
