// TopLogger GraphQL transport. Errors are sanitized: messages are fixed strings, never upstream bodies,
// and tokens are never logged.
const ENDPOINT = 'https://app.toplogger.nu/graphql'

export const REFRESH = 'mutation authSigninRefreshToken($refreshToken: JWT!) { tokens: authSigninRefreshToken(refreshToken: $refreshToken) { access { token expiresAt } refresh { token expiresAt } } }'
export const USER = 'query PlusUser { userMe { id fullName gym { id name } gymUserFavorites { gym { id name } } } }'

export interface Token { token: string, expiresAt: string }
export interface TokenPair { access: Token, refresh: Token }

export class TopLoggerError extends Error {
  constructor(public kind: 'auth' | 'network' | 'api', message: string) {
    super(message)
  }
}

/** Turns an HTTP status and GraphQL body into data, or a sanitized error. */
export function interpret<T>(status: number, body: unknown): T {
  const payload = body as { data?: T, errors?: { extensions?: { code?: unknown } }[] } | null
  const codes = (payload?.errors ?? []).map(e => e?.extensions?.code).filter((c): c is string => typeof c === 'string')
  if (status === 401 || codes.includes('UNAUTHENTICATED')) throw new TopLoggerError('auth', 'TopLogger rejected the session.')
  if (status === 403) throw new TopLoggerError('api', 'TopLogger did not allow this request.')
  if (status >= 500) throw new TopLoggerError('network', 'TopLogger is temporarily unavailable.')
  if (status >= 400 || payload?.errors?.length || !payload?.data) {
    const code = codes[0] && /^[A-Z_]{1,40}$/.test(codes[0]) ? ` (${codes[0]})` : ''
    throw new TopLoggerError('api', `TopLogger could not handle the request${code}.`)
  }
  return payload.data
}

export async function graphql<T>(query: string, variables: Record<string, unknown> = {}, token?: string): Promise<T> {
  let status: number
  let body: unknown
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000),
    })
    status = response.status
    body = await response.json().catch(() => null)
  }
  catch {
    throw new TopLoggerError('network', 'Could not reach TopLogger.')
  }
  return interpret<T>(status, body)
}

export function validTokens(value: unknown): value is TokenPair {
  const t = value as TokenPair | null
  return typeof t?.access?.token === 'string' && !!t.access.token
    && typeof t?.refresh?.token === 'string' && !!t.refresh.token
    && Number.isFinite(Date.parse(t.access.expiresAt))
    && Number.isFinite(Date.parse(t.refresh.expiresAt))
}

/** Exchanges a (single-use) refresh token for a new pair. The old refresh token is dead afterwards. */
export async function exchangeRefreshToken(refreshToken: string): Promise<TokenPair> {
  const data = await graphql<{ tokens: unknown }>(REFRESH, { refreshToken }, refreshToken)
  if (!validTokens(data.tokens)) throw new TopLoggerError('api', 'TopLogger returned an incomplete connection.')
  return data.tokens
}
