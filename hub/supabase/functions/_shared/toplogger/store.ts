// Encrypted TopLogger credential storage and the refresh lifecycle.
//
// TopLogger refresh tokens are single use (verified 2026-10-11): an exchange returns a new pair and kills the
// old refresh token. So the rules here are:
//  - only one instance exchanges at a time per user (a lease on the row),
//  - the new pair is written to the database before the new access token is used,
//  - a refresh is never retried with an old token,
//  - the refresh path always re-reads the row; the in-memory cache only ever holds an access token.
import { adminClient } from '../supabase.ts'
import { decrypt, encrypt, importKey } from './crypto.ts'
import { exchangeRefreshToken, TopLoggerError, type TokenPair } from './graphql.ts'

const TABLE = 'toplogger_credentials'
const KEY_VERSION = 1
const LEASE_MS = 20_000
const WAIT_MS = 10_000
const ACCESS_MARGIN_MS = 60_000

export class ConnectionError extends Error {
  constructor(public code: 'not_connected' | 'reconnect_required' | 'busy' | 'storage', message: string) {
    super(message)
  }
}

interface Row {
  user_id: string
  token_ciphertext: string
  refresh_expires_at: string
  status: 'connected' | 'reconnect_required'
  last_error: string | null
  version: string
}

let keyPromise: Promise<CryptoKey> | undefined
function key(): Promise<CryptoKey> {
  keyPromise ??= importKey(Deno.env.get('TOPLOGGER_ENCRYPTION_KEY') ?? '').catch((error) => {
    keyPromise = undefined
    throw error
  })
  return keyPromise
}

/** Decrypted access tokens by user, per function instance. Disposable: gone on a cold start. */
const cache = new Map<string, { token: string, expiresAt: string }>()
const usable = (expiresAt: string) => Date.parse(expiresAt) - Date.now() > ACCESS_MARGIN_MS
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function seal(userId: string, tokens: TokenPair) {
  return {
    token_ciphertext: await encrypt(await key(), userId, JSON.stringify(tokens)),
    key_version: KEY_VERSION,
    refresh_expires_at: tokens.refresh.expiresAt,
    status: 'connected' as const,
    last_error: null,
    version: crypto.randomUUID(),
    refresh_lock_until: null,
    updated_at: new Date().toISOString(),
  }
}

async function open(row: Row): Promise<TokenPair> {
  return JSON.parse(await decrypt(await key(), row.user_id, row.token_ciphertext)) as TokenPair
}

async function readRow(userId: string): Promise<Row | null> {
  const { data, error } = await adminClient().from(TABLE).select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    throw new ConnectionError('storage', 'Could not read your connection.')
  }
  return data as Row | null
}

/** Stores a freshly validated token pair, replacing any previous connection. */
export async function saveConnection(userId: string, tokens: TokenPair): Promise<void> {
  const { error } = await adminClient().from(TABLE).upsert({ user_id: userId, ...(await seal(userId, tokens)) })
  if (error) {
    throw new ConnectionError('storage', 'Could not save your connection.')
  }
  cache.set(userId, tokens.access)
}

export async function deleteConnection(userId: string): Promise<void> {
  cache.delete(userId)
  const { error } = await adminClient().from(TABLE).delete().eq('user_id', userId)
  if (error) {
    throw new ConnectionError('storage', 'Could not remove your connection.')
  }
}

/** Connection state for the UI. Never includes the ciphertext. */
export async function connectionStatus(userId: string) {
  const { data, error } = await adminClient().from(TABLE)
    .select('status, refresh_expires_at, last_error, updated_at').eq('user_id', userId).maybeSingle()
  if (error) {
    throw new ConnectionError('storage', 'Could not read your connection.')
  }
  return data as { status: string, refresh_expires_at: string, last_error: string | null, updated_at: string } | null
}

async function markReconnect(row: Row, reason: string): Promise<void> {
  cache.delete(row.user_id)
  await adminClient().from(TABLE)
    .update({ status: 'reconnect_required', last_error: reason, refresh_lock_until: null, updated_at: new Date().toISOString() })
    .eq('user_id', row.user_id).eq('version', row.version)
}

async function claimLease(row: Row): Promise<boolean> {
  const now = new Date()
  const { data } = await adminClient().from(TABLE)
    .update({ refresh_lock_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq('user_id', row.user_id).eq('version', row.version)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now.toISOString()}`)
    .select('user_id')
  return (data?.length ?? 0) > 0
}

async function releaseLease(row: Row): Promise<void> {
  await adminClient().from(TABLE).update({ refresh_lock_until: null }).eq('user_id', row.user_id).eq('version', row.version)
}

/** Exchange under the lease, then persist the new pair before anyone uses it. */
async function exchangeAndStore(row: Row, current: TokenPair): Promise<string> {
  let tokens: TokenPair
  try {
    tokens = await exchangeRefreshToken(current.refresh.token)
  }
  catch (error) {
    if (error instanceof TopLoggerError && error.kind === 'auth') {
      await markReconnect(row, 'TopLogger rejected the refresh token.')
      throw new ConnectionError('reconnect_required', 'Your TopLogger connection expired. Connect again.')
    }
    await releaseLease(row) // outage or API change: keep the stored pair, try again later
    throw error
  }

  // The old refresh token is dead now, so this write must not be lost: retry once.
  const sealed = await seal(row.user_id, tokens)
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await adminClient().from(TABLE).update(sealed)
      .eq('user_id', row.user_id).eq('version', row.version).select('user_id')
    if (!error) {
      // Nothing updated: the user reconnected or disconnected meanwhile, so this pair is superseded.
      if (!data?.length) {
        throw new ConnectionError('busy', 'Your connection changed. Try again.')
      }
      cache.set(row.user_id, tokens.access)
      return tokens.access.token
    }
    await sleep(200)
  }
  console.error('toplogger: could not persist rotated tokens for a user; reconnect required')
  throw new ConnectionError('storage', 'Could not save your connection. Connect again.')
}

/**
 * A valid access token for the user, refreshing when needed. `rejected` is an access token TopLogger just
 * refused: it is never returned again, which forces a refresh unless another instance already did one.
 */
export async function accessToken(userId: string, rejected?: string): Promise<string> {
  const cached = cache.get(userId)
  if (cached && cached.token !== rejected && usable(cached.expiresAt)) {
    return cached.token
  }
  cache.delete(userId)

  const deadline = Date.now() + WAIT_MS
  while (true) {
    const row = await readRow(userId)
    if (!row) {
      throw new ConnectionError('not_connected', 'Connect your TopLogger account first.')
    }
    if (row.status !== 'connected') {
      throw new ConnectionError('reconnect_required', 'Your TopLogger connection expired. Connect again.')
    }

    const tokens = await open(row)
    if (tokens.access.token !== rejected && usable(tokens.access.expiresAt)) {
      cache.set(userId, tokens.access) // another instance refreshed already
      return tokens.access.token
    }
    if (Date.parse(tokens.refresh.expiresAt) <= Date.now()) {
      await markReconnect(row, 'Refresh token expired.')
      throw new ConnectionError('reconnect_required', 'Your TopLogger connection expired. Connect again.')
    }
    if (await claimLease(row)) {
      return exchangeAndStore(row, tokens)
    }

    if (Date.now() > deadline) {
      throw new ConnectionError('busy', 'TopLogger is busy. Try again.')
    }
    await sleep(400) // someone else holds the lease: wait for their result
  }
}

/** Connections whose refresh token expires before `cutoff`, soonest first. Used by the scheduled renewal. */
export async function dueConnections(cutoff: Date, limit: number): Promise<string[]> {
  const { data, error } = await adminClient().from(TABLE).select('user_id')
    .eq('status', 'connected').lt('refresh_expires_at', cutoff.toISOString())
    .order('refresh_expires_at').limit(limit)
  if (error) {
    throw new ConnectionError('storage', 'Could not list connections.')
  }
  return (data ?? []).map(row => row.user_id as string)
}

/**
 * Renews a connection regardless of how fresh its access token is, so its refresh expiry slides forward.
 * Skips quietly if another instance holds the lease (it is being renewed right now).
 */
export async function renewConnection(userId: string): Promise<'renewed' | 'skipped'> {
  const row = await readRow(userId)
  if (!row || row.status !== 'connected') {
    return 'skipped'
  }
  const tokens = await open(row)
  if (Date.parse(tokens.refresh.expiresAt) <= Date.now()) {
    await markReconnect(row, 'Refresh token expired.')
    throw new ConnectionError('reconnect_required', 'Connection expired.')
  }
  if (!(await claimLease(row))) {
    return 'skipped'
  }
  await exchangeAndStore(row, tokens)
  return 'renewed'
}

/** Runs a read-only call, with one coordinated refresh and retry if TopLogger rejects the access token. */
export async function readWithAccess<T>(userId: string, call: (token: string) => Promise<T>): Promise<T> {
  const token = await accessToken(userId)
  try {
    return await call(token)
  }
  catch (error) {
    if (!(error instanceof TopLoggerError) || error.kind !== 'auth') {
      throw error
    }
    return call(await accessToken(userId, token))
  }
}
