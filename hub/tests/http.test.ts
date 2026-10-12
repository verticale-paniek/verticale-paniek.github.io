import { describe, expect, it, vi } from 'vitest'
import { corsHeaders, respond } from '../supabase/functions/_shared/http'

vi.mock('../supabase/functions/_shared/supabase.ts', () => ({ adminClient: vi.fn() }))

describe('Edge Function CORS', () => {
  it.each(['https://verticalepaniek.be', 'https://verticale-paniek.github.io', 'http://localhost:3000'])(
    'allows preflight and error responses from %s', async (origin) => {
      const req = new Request('https://example.invalid', { headers: { Origin: origin } })
      expect(corsHeaders(req)['Access-Control-Allow-Origin']).toBe(origin)
      const response = respond(req, 401, { error: 'Not signed in' })
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      expect(response.headers.get('Vary')).toBe('Origin')
      expect(await response.json()).toEqual({ error: 'Not signed in' })
    },
  )

  it('does not allow arbitrary origins', () => {
    const origin = 'https://untrusted.example'
    const req = new Request('https://example.invalid', { headers: { Origin: origin } })
    expect(corsHeaders(req)['Access-Control-Allow-Origin']).not.toBe(origin)
    expect(corsHeaders(req)['Access-Control-Allow-Origin']).not.toBe('*')
  })
})
