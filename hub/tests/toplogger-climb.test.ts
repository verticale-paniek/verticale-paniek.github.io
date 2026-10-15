import { describe, expect, it } from 'vitest'
import { FRENCH_GRADES } from '~/modules/toplogger/utils/domain'
import {
  deleteLog, fetchCommunity, fetchRouteDetail, logAscent, unsend, validDay, voteGrade, VOTABLE_GRADES,
} from '../supabase/functions/_shared/toplogger/climb'
import { TopLoggerError } from '../supabase/functions/_shared/toplogger/graphql'
import type { Call } from '../supabase/functions/_shared/toplogger/ops'

const page = (data: unknown[]) => ({ data, pagination: { total: data.length, page: 1, perPage: 100 } })
const climbUser = (extra: Record<string, unknown> = {}) => ({ climbId: 'r1', grade: null, tickType: 0, totalTries: 0, totalTicks: 0, triedFirstAtDate: null, tickedFirstAtDate: null, ...extra })
const route = (cu: Record<string, unknown> | null = null, extra: Record<string, unknown> = {}) =>
  ({ id: 'r1', grade: 600, leadEnabled: true, leadRequired: false, climbUser: cu, ...extra })
const logItem = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, gymId: 'g', climbId: 'r1', climbedAtDate: '2026-09-20', valid: true, topped: false, autoAdded: false, ...extra })

// Variables are inspected freely by the assertions below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vars = Record<string, any>

interface Sent { query: string, vars: Vars }

/** A fake TopLogger: answers by operation name and records everything sent. */
function fake(answers: Record<string, (vars: Vars) => unknown>) {
  const sent: Sent[] = []
  const call = (async (query: string, vars: Vars = {}) => {
    sent.push({ query, vars })
    const name = /(?:query|mutation) (\w+)/.exec(query)![1]!
    const answer = answers[name]
    if (!answer) {
      throw new Error(`unexpected operation ${name}`)
    }
    return answer(vars)
  }) as Call
  return { call, sent, writes: () => sent.filter(s => s.query.startsWith('mutation')) }
}

const failure = async (work: Promise<unknown>) => {
  try {
    await work
  }
  catch (e) {
    return e instanceof TopLoggerError ? `${e.kind}: ${e.message}` : 'other'
  }
  return 'none'
}

const today = '2026-09-28'
const now = new Date('2026-09-28T12:00:00Z')

describe('logAscent', () => {
  it('uses first-try semantics and the route lead rule, and sends the climber day', async () => {
    const t = fake({ PlusRoute: () => ({ climb: route(null, { leadRequired: true }) }), PlusLogAscent: () => ({ climbUsers: [climbUser({ tickType: 1, totalTries: 1 })] }) })
    for (const type of [1, 2, 3]) {
      await logAscent(t.call, 'g', 'u', 'r1', type, today, now)
    }
    expect(t.writes().map(w => [w.vars.climbLogTriesBefore, w.vars.climbLogData.foreknowledge])).toEqual([[1, true], [0, true], [0, false]])
    for (const w of t.writes()) {
      expect(w.vars).toMatchObject({ gymId: 'g', userId: 'u', climbIds: ['r1'] })
      expect(w.vars.climbLogData).toMatchObject({ topped: true, lead: true, zones: 0, climbedAtDate: today })
    }
  })

  it('records a try without topping, and a repeat as a redpoint with no tries before', async () => {
    const t = fake({ PlusRoute: () => ({ climb: route(climbUser({ tickType: 2, totalTries: 3, totalTicks: 1 })) }), PlusLogAscent: () => ({ climbUsers: [climbUser({ tickType: 2, totalTries: 3 })] }) })
    await logAscent(t.call, 'g', 'u', 'r1', 0, today, now)
    await logAscent(t.call, 'g', 'u', 'r1', 1, today, now)
    expect(t.writes()[0]!.vars.climbLogData).toMatchObject({ topped: false, foreknowledge: false })
    expect(t.writes()[1]!.vars).toMatchObject({ climbLogTriesBefore: 0 })
    expect(t.writes()[1]!.vars.climbLogData).toMatchObject({ topped: true, foreknowledge: true })
  })

  it('refuses flash and onsight after an attempt, bad types and bad dates, without writing', async () => {
    const attempted = fake({ PlusRoute: () => ({ climb: route(climbUser({ totalTries: 3 })) }) })
    expect(await failure(logAscent(attempted.call, 'g', 'u', 'r1', 2, today, now))).toMatch(/first attempt/)
    expect(await failure(logAscent(attempted.call, 'g', 'u', 'r1', 3, today, now))).toMatch(/first attempt/)
    expect(await failure(logAscent(attempted.call, 'g', 'u', 'r1', 4, today, now))).toMatch(/Choose/)
    expect(await failure(logAscent(attempted.call, 'g', 'u', 'r1', '1', today, now))).toMatch(/Choose/)
    expect(await failure(logAscent(attempted.call, 'g', 'u', 'r1', 1, '2026-01-01', now))).toMatch(/Invalid date/)
    expect(attempted.writes()).toHaveLength(0)
  })

  it('refuses incomplete route data', async () => {
    const t = fake({ PlusRoute: () => ({ climb: route(null, { leadEnabled: undefined }) }) })
    expect(await failure(logAscent(t.call, 'g', 'u', 'r1', 1, today, now))).toMatch(/incomplete route/)
    expect(t.writes()).toHaveLength(0)
  })

  it('reports an uncertain write as such, and never retries it', async () => {
    let writes = 0
    const t = fake({
      PlusRoute: () => ({ climb: route() }),
      PlusLogAscent: () => {
        writes++
        throw new TopLoggerError('network', 'timeout')
      },
    })
    expect(await failure(logAscent(t.call, 'g', 'u', 'r1', 1, today, now))).toMatch(/Check TopLogger before saving again/)
    expect(writes).toBe(1)
  })

  it('lets an auth rejection through so the caller can reconnect', async () => {
    const t = fake({ PlusRoute: () => ({ climb: route() }), PlusLogAscent: () => {
      throw new TopLoggerError('auth', 'no')
    } })
    expect(await failure(logAscent(t.call, 'g', 'u', 'r1', 1, today, now))).toBe('auth: no')
  })
})

describe('validDay', () => {
  it('accepts the day around the server clock only', () => {
    expect(validDay('2026-09-28', now)).toBe('2026-09-28')
    expect(validDay('2026-09-27', now)).toBe('2026-09-27')
    expect(validDay('2026-09-29', now)).toBe('2026-09-29')
    for (const bad of ['2026-09-25', '2026-10-02', '28-09-2026', '2026-13-45', 5, undefined]) {
      expect(() => validDay(bad, now)).toThrow()
    }
  })
})

describe('unsend and deleteLog', () => {
  const logs = [logItem('try'), logItem('top', { topped: true }), logItem('gen', { autoAdded: true }), logItem('bad', { topped: true, valid: false })]

  it('deletes only valid sends and generated attempts of this route, keeping genuine tries', async () => {
    const t = fake({ PlusRouteLogs: () => ({ climbLogs: page(logs) }), PlusUnsend: () => ({ climbUsers: [climbUser({ totalTries: 1 })] }) })
    expect((await unsend(t.call, 'g', 'u', 'r1'))?.totalTries).toBe(1)
    expect(t.writes()[0]!.vars).toMatchObject({ gymId: 'g', userId: 'u', ids: ['top', 'gen'] })
  })

  it('does not write when nothing needs removing, and falls back to the route when the response lacks it', async () => {
    const quiet = fake({ PlusRouteLogs: () => ({ climbLogs: page([logItem('try')]) }), PlusRoute: () => ({ climb: route(climbUser({ totalTries: 1 })) }) })
    expect((await unsend(quiet.call, 'g', 'u', 'r1'))?.totalTries).toBe(1)
    expect(quiet.writes()).toHaveLength(0)
    const gap = fake({ PlusRouteLogs: () => ({ climbLogs: page(logs) }), PlusUnsend: () => ({ climbUsers: [] }), PlusRoute: () => ({ climb: route(climbUser({ totalTries: 2 })) }) })
    expect((await unsend(gap.call, 'g', 'u', 'r1'))?.totalTries).toBe(2)
  })

  it('refuses logs of another route and uncertain deletes are reported, not retried', async () => {
    const other = fake({ PlusRouteLogs: () => ({ climbLogs: page([logItem('x', { climbId: 'other' })]) }) })
    expect(await failure(unsend(other.call, 'g', 'u', 'r1'))).toMatch(/Could not verify/)
    let deletes = 0
    const flaky = fake({
      PlusRouteLogs: () => ({ climbLogs: page(logs) }),
      PlusUnsend: () => {
        deletes++
        throw new TopLoggerError('api', 'boom')
      },
    })
    expect(await failure(unsend(flaky.call, 'g', 'u', 'r1'))).toMatch(/Check TopLogger before trying again/)
    expect(deletes).toBe(1)
  })

  it('deletes a single log only when TopLogger lists it for this route', async () => {
    const t = fake({ PlusRouteLogs: () => ({ climbLogs: page(logs) }), PlusUnsend: () => ({ climbUsers: [climbUser()] }) })
    await deleteLog(t.call, 'g', 'u', 'r1', 'try')
    expect(t.writes()[0]!.vars.ids).toEqual(['try'])
    expect(await failure(deleteLog(t.call, 'g', 'u', 'r1', 'nope'))).toMatch(/no longer on TopLogger/)
    expect(await failure(deleteLog(t.call, 'g', 'u', 'r1', { $ne: 1 }))).toMatch(/Invalid log/)
    expect(t.writes()).toHaveLength(1)
  })
})

describe('voteGrade', () => {
  it('votes only on the given route, with a valid grade, and checks the echo', async () => {
    const t = fake({ PlusGradeVote: v => ({ climbUsers: [climbUser({ grade: v.grade })] }) })
    expect((await voteGrade(t.call, 'g', 'u', 'r1', 650)).grade).toBe(650)
    expect(t.writes()[0]!.vars).toMatchObject({ gymId: 'g', userId: 'u', climbIds: ['r1'], grade: 650 })
    expect(await failure(voteGrade(t.call, 'g', 'u', 'r1', 651))).toMatch(/valid French grade/)
    const wrong = fake({ PlusGradeVote: () => ({ climbUsers: [climbUser({ grade: 600 })] }) })
    expect(await failure(voteGrade(wrong.call, 'g', 'u', 'r1', 650))).toMatch(/Check TopLogger before trying again/)
  })

  it('accepts exactly the grades the app offers', () => {
    expect(VOTABLE_GRADES).toEqual(FRENCH_GRADES)
  })
})

describe('route detail', () => {
  const answers = {
    PlusRoute: () => ({ climb: route(climbUser({ tickType: 1 })) }),
    PlusRouteLogs: () => ({ climbLogs: page([logItem('a')]) }),
    PlusCommunity: () => ({ climb: { gradeVoteStats: [{ grade: 600, count: 2 }], ratingVoteStats: [] } }),
    PlusToppers: () => ({ climbUsers: page([{ id: 't1', user: { id: 'x', fullName: 'X' }, tickType: 1, grade: 600 }, { id: 't2', user: null, tickType: 0, grade: null }]) }),
  }

  it('returns route, logs and community together, keeping only real toppers', async () => {
    const detail = await fetchRouteDetail(fake(answers).call, 'g', 'u', 'r1')
    expect(detail.route.id).toBe('r1')
    expect(detail.logs).toHaveLength(1)
    expect(detail.community?.toppers.map(t => t.id)).toEqual(['t1'])
    expect(detail.community?.toppersUnavailable).toBe(false)
  })

  it('degrades logs, toppers and community on API failures but not on auth failures', async () => {
    const down = () => {
      throw new TopLoggerError('api', 'no')
    }
    const detail = await fetchRouteDetail(fake({ ...answers, PlusRouteLogs: down, PlusCommunity: down }).call, 'g', 'u', 'r1')
    expect(detail.logs).toBeNull()
    expect(detail.community).toBeNull()
    expect((await fetchCommunity(fake({ ...answers, PlusToppers: down }).call, 'g', 'r1')).toppersUnavailable).toBe(true)
    const auth = () => {
      throw new TopLoggerError('auth', 'no')
    }
    expect(await failure(fetchRouteDetail(fake({ ...answers, PlusCommunity: auth }).call, 'g', 'u', 'r1'))).toBe('auth: no')
  })

  it('fails when the route itself is gone', async () => {
    expect(await failure(fetchRouteDetail(fake({ ...answers, PlusRoute: () => ({ climb: null }) }).call, 'g', 'u', 'r1'))).toMatch(/no longer available/)
  })
})
