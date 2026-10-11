# Invite-only TopLogger PWA

Status: proposed; no Supabase backend or web deployment is implemented.

## Goal

- Offer the existing phone-sized TopLogger Plus experience as an installable PWA, without app-store distribution.
- Restrict access to the owner and a small set of invited friends; public signup is disabled.
- Let each app user connect their own TopLogger account.
- Keep TopLogger credentials on the server so sessions can be refreshed while the PWA is closed, if TopLogger's refresh-token policy permits it.

## Current state

- The Android app signs in through an app-owned WebView, reads `tl-auth.refresh.token` from `app.toplogger.nu` local storage, then removes that WebView origin's session.
- `TopLoggerClient` exchanges the refresh token using `authSigninRefreshToken`, expects access and refresh tokens with `expiresAt` values, and stores the returned token pair in the Android vault.
- The login plugin explicitly rejects non-native platforms. Browser transport uses `fetch`, but the app does not currently provide browser login or a hosted PWA.
- The implementation relies on TopLogger's current web-app storage shape and undocumented API behavior. Changes by TopLogger can break it.

## Proposed architecture

```text
Phone PWA
  | Supabase Auth JWT
  v
Supabase Edge Function ---- TopLogger GraphQL API
  |                           ^
  | encrypted credentials     | access token
  v                           |
Private credentials table <--+ refresh exchange
  ^
  | scheduled refresh job
  +---------------- Edge Function
```

- Host the generated Nuxt app as a static PWA. Keep Supabase's public URL and anon key in the client; never put a service-role key or TopLogger token in client code or configuration.
- Use Supabase Auth invitations with public signup disabled. An invitation grants access to Plus only; it does not connect the invitee's TopLogger account.
- Send TopLogger operations through an authenticated Edge Function. The function verifies the Supabase JWT, derives the owner from its verified subject, and loads only that owner's credential row. Do not authorize using a caller-supplied `user_id`.
- The Edge Function calls TopLogger, attaches the current access token, handles refresh and token rotation, and returns only the data needed by the PWA. Do not return TopLogger refresh tokens to the client.
- Keep user data separated by Supabase user ID. Apply RLS to all user-owned application data. For the credential table, deny all direct client access; only trusted server-side code may read or write it.

## Credential storage and access

Use a private table, separate from profiles, with one row per Supabase Auth user. A conceptual row contains:

| Field | Purpose |
|---|---|
| `user_id` | Primary/foreign key to `auth.users` |
| `token_ciphertext` | Encrypted TopLogger token bundle |
| `nonce` / `key_version` | Authenticated-encryption metadata and key rotation |
| `refresh_expires_at` | Scheduling and expiry checks; not a substitute for validating the token |
| `status` / `last_error` | Connected, reconnect-required, and sanitized diagnostic state |
| `updated_at` | Operational tracking |

- Encrypt the token bundle in the Edge Function before writing it. Keep the encryption key outside Postgres, preferably in a managed KMS; a server-side Edge Function secret is a simpler first step but shares the Supabase project's trust boundary.
- Supabase-managed encryption at rest protects database media, but does not prevent privileged database or backend access from reading plaintext columns. Application-layer encryption limits exposure from a database-only leak; any service that can decrypt remains trusted.
- Never log tokens, authorization headers, raw token-exchange responses, or request bodies containing credentials. Redact them from errors and analytics.
- The user should not be able to read the stored TopLogger token, even their own. Their authenticated function calls operate on their connection without revealing it.
- A project owner or compromised privileged function may still access/decrypt credentials. Truly user-only encryption is incompatible with unattended server-side refresh unless the user-held key is made available to the server.

## Connecting a TopLogger account

Each invited person must connect their own TopLogger account once. Supabase invitations do not provide TopLogger credentials.

### Pairing protocol

Keep pairing independent of the tool used to obtain the TopLogger token:

1. The user signs into the PWA with Supabase Auth and chooses **Connect TopLogger**.
2. An authenticated Edge Function creates a pairing session bound to the caller's verified Supabase user ID. It returns a cryptographically random, high-entropy, short-lived pairing secret for the user to enter or scan in the connector. The secret identifies the pending Supabase account; it is not a TopLogger token and does not grant general Supabase access.
3. The connector submits the pairing secret and TopLogger refresh token directly to a dedicated HTTPS Edge Function. It must not put either value in a URL, browser storage, logs, analytics, or crash reports.
4. The function validates and rate-limits the pairing secret, atomically claims the pending session, and exchanges the submitted TopLogger token with `authSigninRefreshToken`.
5. On success, the function encrypts and stores the returned token pair against the Supabase user bound to that pairing session, marks the session consumed, and returns only a success result and minimal account confirmation. The PWA can display the connection status without receiving TopLogger credentials.

Pairing secrets are bearer capabilities: anyone who obtains one before it expires may attempt to link a TopLogger account to that pending Supabase user. Therefore make them high entropy, short-lived (for example, five minutes), one-use, rate-limited, and revocable from the PWA. Store only a hash of the secret. Never accept a caller-supplied Supabase user ID as the binding. Do not replace an existing connection until the submitted token has validated; define atomic claim, retry, expiry, and replay behavior so concurrent submissions cannot race.

### Connector UX options

All options use the same pairing endpoint and server-side validation; they differ only in how they obtain and submit the TopLogger token.

- **Android connector app:** reuse the existing official-origin WebView login and same-origin token extraction. Show a field for the pairing secret or scan a QR code displayed by the PWA, then submit directly to the Edge Function. The helper must clearly show the TopLogger origin and never display, copy, or persist the refresh token. The current Android login plugin is native-only and restricts navigation to TopLogger; external identity providers may not work with that flow.
- **Windows helper:** a small desktop app or packaged browser-automation helper can open a controlled TopLogger sign-in session, read the token from that session, and submit it with the pairing secret. Use a dedicated browser profile, not the user's normal browser profile. Account for packaging, browser dependencies, sign-in-provider behavior, and updates; a PowerShell script is possible but may be less convenient to distribute reliably.
- **Manual entry:** the user obtains the refresh token through a trusted method and enters it with the pairing secret in a one-time form. Submit immediately over HTTPS, keep it only in transient form/request memory, never persist it in local/session storage, and clear the field after submission. Warn that clipboard history and clipboard sync can expose copied tokens.

The pairing secret may be shown as a QR code for scanning or as text for manual entry. It must not contain the TopLogger token. A QR code is only a different representation of the same short-lived bearer secret, not an additional authentication factor.

Do not collect or store TopLogger passwords. Validate every submitted token by exchanging it with TopLogger before persisting the returned token pair. Return generic, sanitized errors; never echo credentials or raw upstream responses.

## Refresh lifecycle

- A scheduled server-side job finds credentials whose refresh token will expire before the next scheduled run, with a safety margin, and refreshes them through TopLogger.
- Persist the newly returned token pair atomically, including the new refresh expiry. Serialize refreshes per user so a scheduled job and an API request cannot race while rotating one refresh token.
- The Edge Function also checks expiry before a user request and refreshes when required. Handle an auth rejection with at most one coordinated refresh-and-retry for safe reads; do not blindly retry write mutations.
- If refresh fails because the token is expired or revoked, mark the connection as requiring sign-in and ask that user to reconnect. A scheduled job cannot revive an already expired token.
- Choose the schedule and safety margin only after observing TopLogger's actual expiry behavior. A daily check with a multi-day margin is a candidate, not a verified setting. Account for scheduler delays and temporary TopLogger/Supabase outages.
- Make the refresh process observable through counts and sanitized status, not token values. Alert on repeated failures and avoid tight retry loops.

## Latency

Every TopLogger call goes phone -> Edge Function -> TopLogger and back, so the function must stay thin. Measured on 2026-10-10 from a desktop (not a phone): a direct Supabase REST call took ~0.23 s, a warm Edge Function call ~0.33-0.47 s, a CORS preflight ~0.28 s. The function layer itself is cheap (~0.1-0.2 s); the cost is the number of sequential round trips and cold starts. Practices:

- **Cache the CORS preflight.** Return `Access-Control-Max-Age: 7200` (done in `admin-users`) so the browser skips the extra `OPTIONS` round trip.
- **Verify the JWT locally.** Use `auth.getClaims(token)` (cached signing keys) instead of `auth.getUser(token)`, which calls the auth service on every request. Trade-off: role changes and bans apply when the caller's access token refreshes (<= 1 hour); fine for reads, so re-check against the database for sensitive writes if that matters.
- **Cache inside the function instance.** Keep the decrypted TopLogger session (and the current access token and its expiry) in module-level memory so warm calls skip the credentials read and the decrypt. Treat the cache as disposable: it disappears on a cold start and must never be the only copy. Never log or return its contents.
- **One round trip per screen.** Give the PWA coarse endpoints that fetch what a screen needs from TopLogger in parallel on the server and return one response, instead of many small calls from the phone.
- **Show cached data first.** Render the last result from memory/IndexedDB immediately and refresh in the background (stale-while-revalidate). This improves perceived speed more than any server tuning and makes the module usable on a weak connection in a climbing hall.
- **Keep the function in the same region as the database** and keep the bundle small (few imports) to shorten cold starts.
- **Warm window.** Supabase does not document how long an idle function instance stays warm; assume "a few minutes" and do not depend on it. A climbing session (repeated use within minutes) should mostly hit warm instances, and the first call after a long gap may be noticeably slower. Measure the real gap by timing calls at increasing intervals before relying on any number.
- **Direct browser-to-TopLogger calls are not possible (tested 2026-10-10).** `https://app.toplogger.nu/graphql` answers CORS preflights with `Access-Control-Allow-Origin` only for `https://app.toplogger.nu`; for our origin, `localhost` and `capacitor://localhost` it sends no allow-origin header, so browsers block the call. (The Android app avoids this by using native `CapacitorHttp`, which is not subject to CORS.) Server-side calls from the Edge Function are not affected, which is why every TopLogger call goes through it. Re-test if TopLogger changes its CORS policy.

## Security and operational requirements

- Disable public Supabase signup and verify that only invited identities can sign in. Protect invite and administrative actions.
- Credential rows have no client `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy. The function validates the caller and scopes ordinary operations to that caller's `user_id` even when using a service-role client that bypasses RLS.
- Scheduled refresh runs with server-side privileges only. Protect its trigger/endpoint; do not expose a service-role credential or cron secret to the PWA.
- Validate allowed operations and inputs in the Edge Function. Do not expose an unrestricted GraphQL proxy unless there is a deliberate, reviewed reason.
- Rate-limit user operations, bound pagination and response sizes, and protect TopLogger writes against accidental duplicate submission.
- Define key rotation, backup retention, credential deletion on disconnect/account deletion, and recovery behavior before inviting users.
- Private distribution does not establish that TopLogger authorizes this integration. Review applicable terms and API limits; design for upstream changes and provide a reconnect/error path.

## Decisions and assumptions to verify

- **Sliding refresh expiry: verified 2026-10-11.** The refresh token expires 14 days after it was issued, and each exchange issues a new one (a token issued at 20:35:12 was exchanged at 20:36:07; the new one expires exactly 14 days after 20:36:07). So a refresh at least once every 14 days keeps a connection alive indefinitely. Still to observe: whether TopLogger caps total session age or revokes independently.
- **Refresh rotation: verified 2026-10-11.** Refresh tokens are single use: the second exchange of an already used token fails, and the new refresh token from the first exchange works. The access token lives 10 minutes. Consequences: the new token pair must be persisted before the old one is forgotten (a crash between TopLogger's response and our write loses the connection until the user reconnects), refreshes must be serialized per user, and a refresh should never be retried with the old token.
- **First connection:** choose Android connector, Windows helper, manual entry, or more than one. The pairing protocol should remain the same across them.
- **API behavior:** verify permitted origins, rate limits, token expiry, account-specific permissions, and behavior during TopLogger outages. The Edge Function avoids browser CORS dependence but does not remove API or account restrictions.
- **Data scope:** decide whether the first PWA release includes the existing routes, history, community, and ascent-write features, or starts with a smaller read-only slice.

## Acceptance checks

- An uninvited account cannot create an account or access the PWA's authenticated functions.
- Pairing secrets are bound to the initiating Supabase user, expire, cannot be replayed, and cannot be used to read another user's state.
- Invalid TopLogger credentials are not stored, and a failed attempt cannot replace an existing valid connection.
- Two invited users cannot read, mutate, or infer each other's TopLogger credential rows or account data.
- The PWA bundle, browser storage, network responses, and logs never contain a TopLogger refresh token or service-role key.
- A valid connection can be refreshed while the PWA is closed; the rotated token and expiry are saved, and the next PWA request succeeds.
- Concurrent requests and the scheduled job cannot lose a rotated token or invalidate a healthy connection through a refresh race.
- Expired/revoked credentials result in a clear reconnect state without infinite retries or repeated writes.
- A failed refresh, scheduler delay, TopLogger outage, and user disconnect are handled without exposing credentials or corrupting the stored token state.

## Out of scope for the first implementation

- Public registration, shared TopLogger credentials, or a backend that logs in as the app owner for every friend.
- Password collection, automatic password login, or a browser attempt to read TopLogger cross-origin storage.
- Assuming a scheduled refresh can keep a session alive until TopLogger's sliding-expiry behavior has been demonstrated with a test account.