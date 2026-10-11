// POC: proves an Edge Function can reach TopLogger and shows the raw result to the PWA.
// Sends fixed probe queries only. If the caller passes an access token, one extra authenticated userMe
// call is made with it. The token is used for that single request and is never stored, logged or returned.
// Deployed with verify_jwt = false (see supabase/config.toml): the caller's JWT is verified below.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://verticale-paniek.github.io', 'http://localhost:3000']
const TOPLOGGER_URL = 'https://app.toplogger.nu/graphql'
const PROBES = {
  userMe: { query: 'query PlusUser { userMe { id fullName } }', variables: {} },
  refreshInvalid: {
    query: 'mutation authSigninRefreshToken($refreshToken: JWT!) { tokens: authSigninRefreshToken(refreshToken: $refreshToken) { access { token expiresAt } refresh { token expiresAt } } }',
    variables: { refreshToken: 'invalid' },
  },
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '7200',
    'Vary': 'Origin',
  }
}

function respond(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
}

async function probe(payload: { query: string, variables: Record<string, unknown> }, accessToken?: string) {
  const started = performance.now()
  try {
    const response = await fetch(TOPLOGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    })
    const text = await response.text()
    let body: unknown = text
    try { body = JSON.parse(text) } catch { /* not JSON, return raw */ }
    return { ok: true, status: response.status, statusText: response.statusText, ms: Math.round(performance.now() - started), headers: Object.fromEntries(response.headers), body }
  }
  catch (error) {
    const e = error as Error
    return { ok: false, ms: Math.round(performance.now() - started), exception: { name: e?.name, message: e?.message, cause: String((e as { cause?: unknown })?.cause ?? ''), stack: e?.stack } }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return respond(req, 405, { error: 'Method not allowed' })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return respond(req, 401, { error: 'Not signed in' })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getClaims(token)
  if (error || !data?.claims?.sub) return respond(req, 401, { error: 'Not signed in' })

  let accessToken = ''
  try {
    const body = await req.json()
    if (typeof body?.accessToken === 'string') accessToken = body.accessToken.trim()
  }
  catch { /* no body: unauthenticated probes only */ }

  const jobs: [string, Promise<unknown>][] = Object.entries(PROBES).map(([name, payload]) => [name, probe(payload)])
  if (accessToken) jobs.push(['userMeWithToken', probe(PROBES.userMe, accessToken)])
  const results = Object.fromEntries(await Promise.all(jobs.map(async ([name, job]) => [name, await job])))
  return respond(req, 200, results)
})
