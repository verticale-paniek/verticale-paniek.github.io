import { TopLoggerError } from './graphql.ts'
import { type Call, validId } from './ops.ts'

// Same gym-user scores, eligibility filters and ordering as TopLogger's route leaderboard.
export const RANKINGS = `query PlusRankings($gymId: ID!, $pagination: PaginationInputGymUsers, $routesGradeMin: Int, $tickedVisibleCountRoutesMin: Int) {
  gymUsers(gymId: $gymId, pagination: $pagination, routesGradeMin: $routesGradeMin, tickedVisibleCountRoutesMin: $tickedVisibleCountRoutesMin) {
    pagination { total page perPage }
    data { user { id fullName } routesGrade tickedVisibleCountRoutes }
  }
}`

interface RankingPage {
  pagination: { total: number, page: number, perPage: number }
  data: { user: { id: string, fullName: string | null }, routesGrade: number | null, tickedVisibleCountRoutes: number | null }[]
}

export async function fetchRankings(call: Call, gymId: unknown, metric: unknown, page: unknown) {
  validId(gymId, 'gym')
  if (metric !== 'grade' && metric !== 'tops') {
    throw new TopLoggerError('api', 'Invalid ranking type.')
  }
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > 1000) {
    throw new TopLoggerError('api', 'Invalid ranking page.')
  }
  const key = metric === 'grade' ? 'routesGrade' : 'tickedVisibleCountRoutes'
  const { gymUsers } = await call<{ gymUsers: RankingPage }>(RANKINGS, {
    gymId,
    ...(metric === 'grade' ? { routesGradeMin: 1 } : { tickedVisibleCountRoutesMin: 1 }),
    pagination: { page, perPage: 30, orderBy: [{ key, order: 'desc' }, { key: 'user.firstName', order: 'asc' }, { key: 'user.lastName', order: 'asc' }] },
  })
  const p = gymUsers?.pagination
  if (!p || p.page !== page || p.perPage !== 30 || !Number.isInteger(p.total) || p.total < 0 || !Array.isArray(gymUsers.data)
    || gymUsers.data.some(row => !row?.user?.id || !Number.isFinite(row[key]))) {
    throw new TopLoggerError('api', 'TopLogger returned incomplete rankings.')
  }
  let previous: number | null = null
  let rank = (page - 1) * p.perPage + 1
  return { ...gymUsers, data: gymUsers.data.map((row, index) => {
    const score = row[key]!
    if (score !== previous) {
      rank = (page - 1) * p.perPage + index + 1
    }
    previous = score
    return { ...row, rank }
  }) }
}
