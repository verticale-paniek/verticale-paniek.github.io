import { type Call, fetchRoutes, pages, validId } from './ops.ts'
import { TopLoggerError } from './graphql.ts'

const CLIMBERS = `query PlusClimbers($gymId: ID!, $pagination: PaginationInputGymUsers) {
  gymUsers(gymId: $gymId, pagination: $pagination) {
    pagination { total page perPage } data { user { id fullName } }
  }
}`

/** Uses the caller's token, so TopLogger's visibility rules still apply. */
export async function fetchClimbers(call: Call, gymId: unknown) {
  const rows = await pages<{ user: { id: string, fullName: string | null } }>(call, CLIMBERS, 'gymUsers', { gymId: validId(gymId, 'gym') })
  if (rows.some(row => !row?.user?.id)) {
    throw new TopLoggerError('api', 'TopLogger returned incomplete climbers.')
  }
  return [...new Map(rows.map(row => [row.user.id, row.user])).values()]
}

export async function fetchViewingRoutes(call: Call, gymId: unknown, viewingUserId: unknown) {
  return fetchRoutes(call, gymId, validId(viewingUserId, 'climber'))
}
