import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFloorplan } from '../supabase/functions/_shared/toplogger/floorplan'

const path = 'gyms/klimax/floorplans/3-example.svg'
afterEach(() => vi.unstubAllGlobals())

describe('floorplan proxy', () => {
  it('reads SVGs without requiring upstream CORS headers or forwarding credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('<svg>é</svg>', { headers: { 'content-type': 'image/svg+xml' } }))
    vi.stubGlobal('fetch', fetcher)
    expect(await fetchFloorplan(path)).toEqual({ svg: '<svg>é</svg>' })
    expect(fetcher).toHaveBeenCalledWith(`https://uploads.toplogger.nu/${path}`, {
      redirect: 'error', signal: expect.any(AbortSignal),
    })
  })

  it('rejects arbitrary URLs and traversal before making a request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    for (const bad of [null, '', 'https://evil.test/a.svg', '//evil.test/a.svg', 'gyms/../floorplans/a.svg', 'gyms/g/floorplans/../../a.svg', `${path}?x=1`]) {
      await expect(fetchFloorplan(bad)).rejects.toThrow('Invalid floorplan path.')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects errors, non-SVG content, and oversized responses with a sanitized error', async () => {
    for (const response of [
      new Response('upstream details', { status: 403 }),
      new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }),
      new Response('x'.repeat(2_000_001), { headers: { 'content-type': 'image/svg+xml' } }),
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
      await expect(fetchFloorplan(path)).rejects.toThrow('Could not load the gym floorplan.')
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private upstream details')))
    await expect(fetchFloorplan(path)).rejects.toThrow('Could not load the gym floorplan.')
  })
})
