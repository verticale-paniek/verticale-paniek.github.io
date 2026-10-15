// TopLogger module API. One endpoint, `{ action, ...params }`, called with the user's Supabase JWT.
// The user comes only from the verified JWT, never from the request body. TopLogger tokens never leave
// this function: they are stored encrypted (see _shared/toplogger/store.ts) and never returned or logged.
// Deployed with verify_jwt = false (see supabase/config.toml): the JWT is verified with getClaims below.
import { callerId, corsHeaders, respond, throttle } from '../_shared/http.ts'
import { exchangeRefreshToken, graphql, TopLoggerError, USER } from '../_shared/toplogger/graphql.ts'
import { type Call, fetchHome, type Profile } from '../_shared/toplogger/ops.ts'
import {
  ConnectionError,
  connectionStatus,
  deleteConnection,
  readWithAccess,
  saveConnection,
} from '../_shared/toplogger/store.ts'

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/

/** A TopLogger caller for one user: refreshes and retries on an expired access token (see readWithAccess). */
function callerFor(userId: string): Call {
  return (query, variables = {}) => readWithAccess(userId, token => graphql(query, variables, token))
}

// Per instance, short-lived: the user may reconnect a different TopLogger account (other instances catch up on expiry).
const profiles = new Map<string, { profile: Profile, until: number }>()

function cachedProfile(userId: string): Profile | undefined {
  const hit = profiles.get(userId)
  return hit && hit.until > Date.now() ? hit.profile : undefined
}

function fail(req: Request, error: unknown): Response {
  if (error instanceof ConnectionError) {
    const status = { not_connected: 409, reconnect_required: 409, busy: 503, storage: 500 }[error.code]
    return respond(req, status, { error: error.message, code: error.code })
  }
  if (error instanceof TopLoggerError) {
    if (error.kind === 'auth') {
      return respond(req, 409, { error: 'Your TopLogger connection expired. Connect again.', code: 'reconnect_required' })
    }
    return respond(req, 502, { error: error.message, code: 'upstream' })
  }
  // Unknown failure: log only the type, never the message (it could echo upstream data).
  console.error('toplogger: unexpected error', (error as Error)?.name)
  return respond(req, 500, { error: 'Something went wrong.', code: 'internal' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return respond(req, 405, { error: 'Method not allowed' })
  }

  const userId = await callerId(req)
  if (!userId) {
    return respond(req, 401, { error: 'Not signed in' })
  }
  if (!throttle(userId, 60, 60_000)) {
    return respond(req, 429, { error: 'Too many requests', code: 'rate_limited' })
  }

  let body: { action?: string, refreshToken?: unknown, gymId?: unknown }
  try {
    body = await req.json()
  }
  catch {
    return respond(req, 400, { error: 'Invalid request', code: 'bad_request' })
  }

  try {
    switch (body.action) {
      case 'status': {
        const row = await connectionStatus(userId)
        return respond(req, 200, row
          ? { connected: row.status === 'connected', status: row.status, refreshExpiresAt: row.refresh_expires_at, lastError: row.last_error, updatedAt: row.updated_at }
          : { connected: false, status: 'not_connected' })
      }

      case 'connect': {
        if (!throttle(`connect:${userId}`, 5, 60_000)) {
          return respond(req, 429, { error: 'Too many attempts. Wait a minute.', code: 'rate_limited' })
        }
        const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : ''
        if (!JWT_SHAPE.test(refreshToken)) {
          return respond(req, 400, { error: 'That does not look like a TopLogger refresh token.', code: 'invalid_token' })
        }
        // Validate by exchanging first: a bad token never replaces an existing connection.
        let tokens
        try {
          tokens = await exchangeRefreshToken(refreshToken)
        }
        catch (error) {
          if (error instanceof TopLoggerError && error.kind === 'auth') {
            return respond(req, 400, { error: 'TopLogger did not accept that token. Copy a fresh one (each token works once).', code: 'invalid_token' })
          }
          throw error
        }
        await saveConnection(userId, tokens)
        profiles.delete(userId)
        return respond(req, 200, { connected: true, refreshExpiresAt: tokens.refresh.expiresAt })
      }

      case 'disconnect':
        await deleteConnection(userId)
        profiles.delete(userId)
        return respond(req, 200, { connected: false })

      case 'profile': {
        const data = await readWithAccess(userId, token => graphql<{ userMe: unknown }>(USER, {}, token))
        return respond(req, 200, data.userMe)
      }

      case 'routes': {
        const call = callerFor(userId)
        const home = await fetchHome(call, body.gymId, cachedProfile(userId))
        profiles.set(userId, { profile: home.profile, until: Date.now() + 600_000 })
        return respond(req, 200, home)
      }

      default:
        return respond(req, 400, { error: 'Unknown action', code: 'bad_request' })
    }
  }
  catch (error) {
    return fail(req, error)
  }
})
