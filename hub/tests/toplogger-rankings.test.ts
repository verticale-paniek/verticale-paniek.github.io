import { describe, expect, it } from 'vitest'
import { fetchRankings } from '../supabase/functions/_shared/toplogger/rankings'
import type { Call } from '../supabase/functions/_shared/toplogger/ops'

describe('gym rankings', () => {
  it('uses TopLogger eligibility, sorting and pagination for each ranking type', async () => {
    for (const metric of ['grade', 'tops']) {
      let sent: Record<string, unknown> = {}
      const data = [{ user: { id: 'climber', fullName: 'Climber' }, routesGrade: 802, tickedVisibleCountRoutes: 217 }]
      const call = (async (_query: string, variables: Record<string, unknown>) => {
        sent = variables
        return { gymUsers: { data, pagination: { total: 157, page: 2, perPage: 30 } } }
      }) as Call
      expect((await fetchRankings(call, 'gym', metric, 2)).data).toEqual(data.map(row => ({ ...row, rank: 31 })))
      expect(sent).toEqual({
        gymId: 'gym',
        ...(metric === 'grade' ? { routesGradeMin: 1 } : { tickedVisibleCountRoutesMin: 1 }),
        pagination: { page: 2, perPage: 30, orderBy: [
          { key: metric === 'grade' ? 'routesGrade' : 'tickedVisibleCountRoutes', order: 'desc' },
          { key: 'user.firstName', order: 'asc' }, { key: 'user.lastName', order: 'asc' },
        ] },
      })
    }
  })

  it('rejects invalid inputs before calling upstream', async () => {
    const call = (() => {
      throw new Error('Must not call upstream')
    }) as Call
    for (const [gym, metric, page] of [['bad gym', 'grade', 1], ['gym', 'unknown', 1], ['gym', 'grade', 0], ['gym', 'tops', 1.5], ['gym', 'tops', 1001]]) {
      await expect(fetchRankings(call, gym, metric, page)).rejects.toThrow('Invalid')
    }
  })

  it('uses TopLogger page-local shared ranks for equal scores', async () => {
    const data = [800, 800, 780].map((routesGrade, i) => ({ user: { id: String(i), fullName: null }, routesGrade, tickedVisibleCountRoutes: 1 }))
    const call = (async () => ({ gymUsers: { data, pagination: { total: 33, page: 2, perPage: 30 } } })) as Call
    expect((await fetchRankings(call, 'gym', 'grade', 2)).data.map(row => row.rank)).toEqual([31, 31, 33])
  })

  it('accepts empty rankings but refuses incomplete or mismatched results', async () => {
    const empty = { data: [], pagination: { total: 0, page: 1, perPage: 30 } }
    expect(await fetchRankings((async () => ({ gymUsers: empty })) as Call, 'gym', 'grade', 1)).toEqual(empty)
    for (const result of [null, { ...empty, pagination: { ...empty.pagination, page: 2 } }, { ...empty, data: [{ user: null, routesGrade: 800 }] }, { ...empty, data: [{ user: { id: 'x' }, routesGrade: null }] }]) {
      await expect(fetchRankings((async () => ({ gymUsers: result })) as Call, 'gym', 'grade', 1)).rejects.toThrow('incomplete rankings')
    }
  })
})
