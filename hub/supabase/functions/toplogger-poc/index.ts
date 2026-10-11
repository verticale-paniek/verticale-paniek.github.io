// POC: proves an Edge Function can reach TopLogger and shows the raw result to the PWA.
// Sends fixed, unauthenticated probe queries only; no TopLogger token is involved yet.
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

async function probe(payload: { query: string, variables: Record<string, unknown> }) {
  const started = performance.now()
  try {
    const response = await fetch(TOPLOGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const results = Object.fromEntries(await Promise.all(Object.entries(PROBES).map(async ([name, payload]) => [name, await probe(payload)])))
  return respond(req, 200, results)
})
