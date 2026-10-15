import { describe, expect, it } from 'vitest'
import { fetchHistory } from '../supabase/functions/_shared/toplogger/history'
import { TopLoggerError } from '../supabase/functions/_shared/toplogger/graphql'
import type { Call } from '../supabase/functions/_shared/toplogger/ops'

// Variables are inspected freely by the assertions below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vars = Record<string, any>

const now = new Date('2026-09-28T12:00:00Z')

const climb = (id: string, extra: Record<string, unknown> = {}) => ({ id, grade: 600, name: null, climbType: 'route', gymId: 'g', ...extra })
const item = (id: string, tickType: number, climbExtra: Record<string, unknown> = {}) => ({ id: `u-${id}`, tickType, climb: climb(id, climbExtra) })
const day = (date: string, items: unknown[], extra: Record<string, unknown> = {}) => ({ id: `d-${date}`, gymId: 'g', statsAtDate: date, climbUserDays: items, ...extra })

/** A fake TopLogger returning the given days (as one or more pages) and recording what was sent. */
function fake(days: unknown[], perPage = 100) {
  const sent: { query: string, vars: Vars }[] = []
  const call = (async (query: string, vars: Vars = {}) => {
    sent.push({ query, vars })
    const page = vars.pagination.page as number
    return { climbDaysPaginated: { data: days.slice((page - 1) * perPage, page * perPage), pagination: { total: days.length, page, perPage } } }
  }) as Call
  return { call, sent }
}

const failure = async (work: Promise<unknown>) => {
  try {
    await work
  }
  catch (e) {
    return e instanceof TopLoggerError ? e.message : 'other'
  }
  return 'none'
}

describe('fetchHistory', () => {
  it('makes one call and turns each topped route-day into a log', async () => {
    const t = fake([
      day('2026-09-20', [item('a', 3), item('b', 1), item('tried', 0)]),
      day('2026-09-25', [item('a', 1)]),
    ])
    const { logs, routes } = await fetchHistory(t.call, 'g', 'tl-user', now)
    expect(t.sent).toHaveLength(1)
    expect(logs.map(l => [l.climbId, l.tickType, l.climbedAtDate])).toEqual([['a', 3, '2026-09-20'], ['b', 1, '2026-09-20'], ['a', 1, '2026-09-25']])
    expect(logs[0]).toMatchObject({ gymId: 'g', climbType: 'route', valid: true, ticked: true, topped: true })
    expect(new Set(logs.map(l => l.id)).size).toBe(3)
    expect(routes.map(r => r.id)).toEqual(['a', 'b'])
    expect(routes[0]).toMatchObject({ id: 'a', grade: 600, climbUser: null })
    expect(routes[0]).not.toHaveProperty('climbType')
  })

  it('asks for this gym and account, over a window wider than 180 days, in the query text', async () => {
    const t = fake([])
    await fetchHistory(t.call, 'g', 'tl-user', now)
    const { query, vars } = t.sent[0]!
    expect(query).toContain('gymId: "g"')
    expect(query).toContain('climbType: "route"')
    expect(vars.userId).toBe('tl-user')
    expect(Date.parse(vars.from)).toBeLessThan(now.getTime() - 180 * 86400000)
    expect(vars.pagination.perPage).toBe(100)
  })

  it('keeps routes once and follows pagination', async () => {
    const days = Array.from({ length: 5 }, (_, i) => day(`2026-09-0${i + 1}`, [item('same', 1)]))
    const t = fake(days, 2)
    const { logs, routes } = await fetchHistory(t.call, 'g', 'u', now)
    expect(t.sent).toHaveLength(3)
    expect(logs).toHaveLength(5)
    expect(routes).toHaveLength(1)
  })

  it('ignores other gyms, other climb types and tries only', async () => {
    const t = fake([day('2026-09-20', [item('x', 1, { gymId: 'other' }), item('y', 1, { climbType: 'boulder' }), item('z', 0), item('ok', 2)])])
    expect((await fetchHistory(t.call, 'g', 'u', now)).logs.map(l => l.climbId)).toEqual(['ok'])
  })

  it('fails on malformed data instead of returning a partial history', async () => {
    const bad = [
      day('soon', []),
      day('2026-09-20', [], { gymId: 'other' }),
      day('2026-09-20', [{ id: 'u', tickType: 1, climb: null }]),
      day('2026-09-20', [{ id: 'u', tickType: 1, climb: climb('a', { grade: 'high' }) }]),
      day('2026-09-20', [{ id: 'u', tickType: 'two', climb: climb('a') }]),
      { ...day('2026-09-20', []), climbUserDays: null },
    ]
    for (const entry of bad) {
      expect(await failure(fetchHistory(fake([entry]).call, 'g', 'u', now))).toMatch(/incomplete ascent history/)
    }
  })

  it('rejects a bad gym id without calling TopLogger', async () => {
    const t = fake([])
    expect(await failure(fetchHistory(t.call, 'g" ) { x', 'u', now))).toBe('Invalid gym.')
    expect(t.sent).toHaveLength(0)
  })
})
