import { describe, expect, it } from 'vitest'
import { TopLoggerError } from '../supabase/functions/_shared/toplogger/graphql'
import { fetchHome, fetchRoutes, gymsOf, pages, type Call } from '../supabase/functions/_shared/toplogger/ops'

const page = (data: unknown[], p: number, total: number, perPage = 100) => ({ data, pagination: { total, page: p, perPage } })
const failure = async (work: Promise<unknown>) => {
  try {
    await work
  }
  catch (e) {
    return e instanceof TopLoggerError ? e.message : 'other'
  }
  return 'none'
}

describe('pages', () => {
  it('collects every page and sends the pagination', async () => {
    const seen: unknown[] = []
    const call = (async (_q: string, v: Record<string, unknown>) => {
      seen.push(v.pagination)
      const n = (v.pagination as { page: number }).page
      return { items: page([n * 10, n * 10 + 1], n, 5, 2) }
    }) as Call
    expect(await pages(call, 'q', 'items', {})).toEqual([10, 11, 20, 21, 30, 31])
    expect(seen).toHaveLength(3)
  })

  it('refuses a page that does not match the request', async () => {
    const call = (async () => ({ items: page([1], 2, 300) })) as Call
    expect(await failure(pages(call, 'q', 'items', {}))).toMatch(/incomplete pagination/)
  })

  it('refuses an empty page before the total is reached', async () => {
    const call = (async (_q: string, v: Record<string, unknown>) =>
      ({ items: page([], (v.pagination as { page: number }).page, 300) })) as Call
    expect(await failure(pages(call, 'q', 'items', {}))).toMatch(/incomplete data/)
  })

  it('gives up on endless pagination', async () => {
    const call = (async (_q: string, v: Record<string, unknown>) =>
      ({ items: page([1], (v.pagination as { page: number }).page, 1e9, 1) })) as Call
    expect(await failure(pages(call, 'q', 'items', {}))).toMatch(/too much data/)
  })
})

describe('fetchRoutes', () => {
  const route = { id: 'r1', grade: 600 }

  it('passes the gym and TopLogger user id', async () => {
    let vars: Record<string, unknown> = {}
    const call = (async (_q: string, v: Record<string, unknown>) => {
      vars = v
      return { climbs: page([route], 1, 1) }
    }) as Call
    expect(await fetchRoutes(call, '42', 'tl-user')).toEqual([route])
    expect(vars).toMatchObject({ gymId: '42', userId: 'tl-user' })
  })

  it('keeps a route once when it appears on two pages', async () => {
    const call = (async (_q: string, v: Record<string, unknown>) => {
      const n = (v.pagination as { page: number }).page
      return { climbs: page(n === 1 ? [route, { id: 'r2', grade: 610 }] : [{ id: 'r2', grade: 610 }, { id: 'r3', grade: 620 }], n, 4, 2) }
    }) as Call
    expect((await fetchRoutes(call, '1', 'u')).map(r => r.id)).toEqual(['r1', 'r2', 'r3'])
  })

  it('rejects malformed gym ids without calling TopLogger', async () => {
    const call = (async () => {
      throw new Error('should not be called')
    }) as Call
    for (const bad of [undefined, 5, '', 'a b', '1; drop', 'x'.repeat(41)]) {
      expect(await failure(fetchRoutes(call, bad, 'u'))).toBe('Invalid gym.')
    }
  })

  it('rejects routes without an id or a numeric grade', async () => {
    const call = (async () => ({ climbs: page([{ id: 'r1' }], 1, 1) })) as Call
    expect(await failure(fetchRoutes(call, '1', 'u'))).toMatch(/incomplete route data/)
  })
})

describe('fetchHome', () => {
  const gym = (id: string) => ({ id, name: `Gym ${id}` })
  const profile = { id: 'tl-user', fullName: 'A Climber', gym: gym('1'), gymUserFavorites: [{ gym: gym('1') }, { gym: gym('2') }] }
  const fakeCall = (seen: Record<string, unknown>[] = []) => (async (query: string, v: Record<string, unknown>) => {
    if (query.includes('userMe')) {
      return { userMe: profile }
    }
    seen.push(v)
    return { climbs: page([{ id: 'r', grade: 600 }], 1, 1) }
  }) as Call

  it('uses the home gym by default and lists gyms once', async () => {
    const home = await fetchHome(fakeCall(), undefined)
    expect(home.gymId).toBe('1')
    expect(gymsOf(profile).map(g => g.id)).toEqual(['1', '2'])
  })

  it('honours a requested gym the user has, and ignores one they do not', async () => {
    expect((await fetchHome(fakeCall(), '2')).gymId).toBe('2')
    expect((await fetchHome(fakeCall(), '999')).gymId).toBe('1')
  })

  it('reuses a cached profile instead of asking TopLogger again', async () => {
    const seen: Record<string, unknown>[] = []
    const call = (async (query: string, v: Record<string, unknown>) => {
      expect(query).not.toContain('userMe')
      seen.push(v)
      return { climbs: page([{ id: 'r', grade: 600 }], 1, 1) }
    }) as Call
    await fetchHome(call, '2', profile)
    expect(seen[0]).toMatchObject({ gymId: '2', userId: 'tl-user' })
  })

  it('fails when the account has no gym', async () => {
    const call = (async () => ({ userMe: { ...profile, gym: null, gymUserFavorites: [] } })) as Call
    expect(await failure(fetchHome(call, undefined))).toMatch(/No gym/)
  })
})
