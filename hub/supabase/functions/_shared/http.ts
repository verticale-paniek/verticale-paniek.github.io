import { adminClient } from './supabase.ts'

const ALLOWED_ORIGINS = ['https://verticale-paniek.github.io', 'http://localhost:3000']

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Let the browser reuse the preflight answer instead of an extra round trip per call.
    'Access-Control-Max-Age': '7200',
    'Vary': 'Origin',
  }
}

export function respond(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/** Verifies the caller's Supabase JWT locally (cached signing keys) and returns the user id, or null. */
export async function callerId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return null
  }
  const { data, error } = await adminClient().auth.getClaims(token)
  return error || !data?.claims?.sub ? null : data.claims.sub
}

const hits = new Map<string, number[]>()

/** Best-effort per-instance rate limit. Returns false when the caller is over the limit. */
export function throttle(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
