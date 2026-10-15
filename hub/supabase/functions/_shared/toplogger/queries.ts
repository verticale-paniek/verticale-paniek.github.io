// The TopLogger GraphQL operations this app is allowed to send. Callers pick an action; they never supply
// query text. Field lists were ported from the original Android app (verified against the live schema there).
/** A route as TopLogger describes it, without this user's progress on it. */
export const ROUTE_CORE = `id grade name label inAt outAt outPlannedAt setterName leadEnabled leadRequired
  climbSetters { gymAdmin { name } } wall { nameLoc } holdColor { color nameLoc }`

export const ROUTE_FIELDS = `${ROUTE_CORE}
  climbUser(userId: $userId) { grade tickType totalTries totalTicks triedFirstAtDate tickedFirstAtDate }`

export const ROUTES = `query PlusRoutes($gymId: ID!, $userId: ID!, $pagination: PaginationInputClimbs) {
  climbs(gymId: $gymId, climbType: route, pagination: $pagination) { pagination { total page perPage } data { ${ROUTE_FIELDS} } }
}`

export const ROUTE = `query PlusRoute($gymId: ID!, $id: ID!, $userId: ID!) { climb(gymId: $gymId, id: $id) { ${ROUTE_FIELDS} } }`

const CLIMB_USER_RESULT = 'climbId grade tickType totalTries totalTicks triedFirstAtDate tickedFirstAtDate'

export const LOG_ASCENT = `mutation PlusLogAscent($gymId: ID!, $userId: ID!, $climbIds: [ID!]!, $climbLogTriesBefore: Int, $climbLogData: ClimbLogInput!) {
  climbUsers: climbUserLog(gymId: $gymId, userId: $userId, climbIds: $climbIds, climbType: route, climbLogTriesBefore: $climbLogTriesBefore, climbLogData: $climbLogData) {
    ${CLIMB_USER_RESULT}
  }
}`

export const ROUTE_LOGS = `query PlusRouteLogs($gymId: ID!, $userId: ID!, $climbId: ID!, $pagination: PaginationInputClimbLogs) {
  climbLogs(gymId: $gymId, userId: $userId, climbId: $climbId, climbType: route, pagination: $pagination) {
    pagination { total page perPage } data {
      id gymId climbId climbedAtDate valid topped ticked tickType tickIndex tryIndex lead autoAdded
    }
  }
}`

export const UNSEND = `mutation PlusUnsend($gymId: ID!, $userId: ID!, $ids: [ID!]!) {
  climbUsers: climbUserDeleteLogs(gymId: $gymId, userId: $userId, ids: $ids) {
    ${CLIMB_USER_RESULT}
  }
}`

export const GRADE_VOTE = `mutation PlusGradeVote($gymId: ID!, $userId: ID!, $climbIds: [ID!]!, $grade: Int!) {
  climbUsers: climbUserOpinion(gymId: $gymId, userId: $userId, climbIds: $climbIds, climbType: route, climbUserOpinionData: { grade: $grade }) {
    ${CLIMB_USER_RESULT}
  }
}`

export const COMMUNITY = `query PlusCommunity($gymId: ID!, $id: ID!) {
  climb(gymId: $gymId, id: $id) { gradeVoteStats { grade count } ratingVoteStats { stars count } }
}`

export const TOPPERS = `query PlusToppers($gymId: ID!, $climbId: ID!, $pagination: PaginationInputClimbUsers) {
  climbUsers(gymId: $gymId, climbId: $climbId, pagination: $pagination) {
    pagination { total page perPage } data { id user { id fullName } tickType grade }
  }
}`

/**
 * Everything the Top 10 needs in one call: the climber's session days at a gym, and for each day the routes
 * climbed with the tick type achieved that day, with the route's own details nested (so routes that have left the
 * wall need no lookup). The gym id is placed in the text, so callers must pass it through validId first.
 * Verified against live data on 2026-10-15: tick types match the per-day logs, and the nested limit does not truncate.
 */
export const historyQuery = (gymId: string) => `query PlusHistory($userId: ID!, $from: DateTime!, $until: DateTime!, $pagination: PaginationInputClimbDays) {
  climbDaysPaginated(userId: $userId, gymId: "${gymId}", totalTriesMin: 1, routesTotalTriesMin: 1, statsAtDateMin: $from, statsAtDateMax: $until, pagination: $pagination) {
    pagination { total page perPage }
    data { id gymId statsAtDate climbUserDays(climbType: "route", limit: 1000) { id tickType climb { ${ROUTE_CORE} climbType gymId } } }
  }
}`
