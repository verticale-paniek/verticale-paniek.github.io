// Route detail and write operations. Like ops.ts these take a `Call` bound to one user. Every write re-reads the
// route (or its logs) from TopLogger and validates against that, never against what the phone claims.
import { TopLoggerError } from './graphql.ts'
import { type Call, pages, type RouteRecord, validId } from './ops.ts'
import { COMMUNITY, GRADE_VOTE, LOG_ASCENT, ROUTE, ROUTE_LOGS, TOPPERS, UNSEND } from './queries.ts'

export interface ClimbUserRecord {
  grade: number | null
  tickType: number
  totalTries: number
  totalTicks?: number | null
  [key: string]: unknown
}

export interface RouteDetailRecord extends RouteRecord {
  leadEnabled?: boolean
  leadRequired?: boolean
  climbUser: ClimbUserRecord | null
}

export interface RouteLogRecord {
  id: string
  gymId: string
  climbId: string
  climbedAtDate: string
  valid: boolean
  topped: boolean
  autoAdded: boolean
  [key: string]: unknown
}

export interface Community {
  gradeVoteStats: { grade: number, count: number }[]
  ratingVoteStats: { stars: number, count: number }[]
  toppers: { id: string, user: { id: string, fullName: string } | null, tickType: number, grade: number | null }[]
  toppersUnavailable: boolean
}

/** The French grades a climber may vote, on TopLogger's numeric scale. Mirrors FRENCH_GRADES in the PWA module (a test keeps them equal). */
export const VOTABLE_GRADES = [
  200, 300, 333, 367, 400, 433, 467,
  ...Array.from({ length: 5 }, (_, index) => [0, 17, 33, 50, 67, 83].map(offset => (index + 5) * 100 + offset)).flat(),
].filter(grade => grade <= 950)

/** Runs a read that may fail without sinking the screen. Auth and connection problems still propagate. */
export async function optional<T>(work: Promise<T>): Promise<T | null> {
  try {
    return await work
  }
  catch (error) {
    if (error instanceof TopLoggerError && error.kind !== 'auth') {
      return null
    }
    throw error
  }
}

/** Runs a write. Any failure other than an auth rejection leaves the outcome unknown, so the message says so: the caller must not retry blindly. */
async function uncertain<T>(failure: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  }
  catch (error) {
    if (error instanceof TopLoggerError && error.kind !== 'auth') {
      throw new TopLoggerError('network', failure)
    }
    throw error
  }
}

function validClimbUser(item: unknown): item is ClimbUserRecord & { climbId: string } {
  const c = item as (ClimbUserRecord & { climbId?: unknown }) | null
  return !!c && typeof c.climbId === 'string' && Number.isFinite(c.tickType) && Number.isFinite(c.totalTries)
}

export async function fetchRoute(call: Call, gymId: string, userId: string, routeId: string): Promise<RouteDetailRecord> {
  const data = await call<{ climb: RouteDetailRecord | null }>(ROUTE, { gymId: validId(gymId, 'gym'), id: validId(routeId, 'route'), userId })
  if (typeof data.climb?.id !== 'string' || !Number.isFinite(data.climb.grade)) {
    throw new TopLoggerError('api', 'This route is no longer available from TopLogger.')
  }
  return data.climb
}

export async function fetchRouteLogs(call: Call, gymId: string, userId: string, routeId: string): Promise<RouteLogRecord[]> {
  const logs = await pages<RouteLogRecord>(call, ROUTE_LOGS, 'climbLogs', { gymId: validId(gymId, 'gym'), userId, climbId: validId(routeId, 'route') })
  if (logs.some(l => !l || typeof l.id !== 'string' || l.gymId !== gymId || l.climbId !== routeId || typeof l.valid !== 'boolean'
    || typeof l.topped !== 'boolean' || typeof l.autoAdded !== 'boolean' || !Number.isFinite(Date.parse(l.climbedAtDate)))) {
    throw new TopLoggerError('api', 'Could not verify this route’s ascents.')
  }
  return logs
}

export async function fetchVoteStats(call: Call, gymId: string, routeId: string) {
  const data = await call<{ climb: Pick<Community, 'gradeVoteStats' | 'ratingVoteStats'> | null }>(COMMUNITY, { gymId: validId(gymId, 'gym'), id: validId(routeId, 'route') })
  if (!data.climb || !Array.isArray(data.climb.gradeVoteStats) || !Array.isArray(data.climb.ratingVoteStats)) {
    throw new TopLoggerError('api', 'Community statistics are not available for this route.')
  }
  return data.climb
}

export async function fetchCommunity(call: Call, gymId: string, routeId: string): Promise<Community> {
  const [stats, toppers] = await Promise.all([
    fetchVoteStats(call, gymId, routeId),
    optional(pages<Community['toppers'][number]>(call, TOPPERS, 'climbUsers', { gymId, climbId: routeId })),
  ])
  return { ...stats, toppers: (toppers ?? []).filter(t => t.tickType > 0), toppersUnavailable: toppers === null }
}

/** One round trip for the route screen. Logs and community may be missing (null); the route itself may not. */
export async function fetchRouteDetail(call: Call, gymId: string, userId: string, routeId: string) {
  const [route, logs, community] = await Promise.all([
    fetchRoute(call, gymId, userId, routeId),
    optional(fetchRouteLogs(call, gymId, userId, routeId)),
    optional(fetchCommunity(call, gymId, routeId)),
  ])
  return { route, logs, community }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** The climber's local calendar day, sent by the phone. Accepted only within a day or so of the server clock. */
export function validDay(value: unknown, now = new Date()): string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    || Math.abs(Date.parse(`${value}T12:00:00Z`) - now.getTime()) > 36 * 3600_000) {
    throw new TopLoggerError('api', 'Invalid date.')
  }
  return value
}

/** Logs a try (0), redpoint (1), flash (2) or onsight (3) with TopLogger's first-try rules. */
export async function logAscent(call: Call, gymId: string, userId: string, routeId: string, tickType: unknown, climbedAtDate: unknown, now = new Date()) {
  if (typeof tickType !== 'number' || ![0, 1, 2, 3].includes(tickType)) {
    throw new TopLoggerError('api', 'Choose Try, Redpoint, Flash, or Onsight.')
  }
  const day = validDay(climbedAtDate, now)
  // The route is re-read here: the phone's copy is never trusted for the rules or for lead/toprope.
  const route = await fetchRoute(call, gymId, userId, routeId)
  const tries = route.climbUser?.totalTries ?? 0
  if (tickType > 1 && (tries || route.climbUser?.tickType)) {
    throw new TopLoggerError('api', 'Flash and Onsight require a first attempt. Choose Redpoint for another ascent.')
  }
  if (typeof route.leadEnabled !== 'boolean' || typeof route.leadRequired !== 'boolean') {
    throw new TopLoggerError('api', 'TopLogger returned incomplete route data.')
  }
  const lead = route.leadRequired
  return uncertain('Could not confirm whether the ascent was saved. Check TopLogger before saving again.', async () => {
    const data = await call<{ climbUsers: unknown[] }>(LOG_ASCENT, {
      gymId,
      userId,
      climbIds: [routeId],
      climbLogTriesBefore: tickType === 1 && !tries ? 1 : 0,
      climbLogData: { topped: tickType > 0, foreknowledge: tickType === 1 || tickType === 2, zones: 0, lead, climbedAtDate: day },
    })
    const saved = data.climbUsers?.find(validClimbUser)
    if (!saved || saved.climbId !== routeId) {
      throw new TopLoggerError('network', 'Incomplete save response.')
    }
    return saved
  })
}

function deleteLogs(call: Call, gymId: string, userId: string, routeId: string, ids: string[], failure: string) {
  return uncertain(failure, async () => {
    const data = await call<{ climbUsers: unknown[] }>(UNSEND, { gymId, userId, ids })
    const updated = data.climbUsers?.find(validClimbUser)
    return updated && updated.climbId === routeId ? updated : (await fetchRoute(call, gymId, userId, routeId)).climbUser
  })
}

/** Like the official Redpoint uncheck: removes sends and generated attempts, keeps genuine tries. */
export async function unsend(call: Call, gymId: string, userId: string, routeId: string) {
  const logs = await fetchRouteLogs(call, gymId, userId, routeId)
  const ids = logs.filter(l => l.valid && (l.topped || l.autoAdded)).map(l => l.id)
  if (!ids.length) {
    return (await fetchRoute(call, gymId, userId, routeId)).climbUser
  }
  return deleteLogs(call, gymId, userId, routeId, ids, 'Could not confirm whether the sends were removed. Check TopLogger before trying again.')
}

/** Deletes one log, only if TopLogger currently lists it for this user and route. */
export async function deleteLog(call: Call, gymId: string, userId: string, routeId: string, logId: unknown) {
  const id = validId(logId, 'log')
  if (!(await fetchRouteLogs(call, gymId, userId, routeId)).some(l => l.id === id)) {
    throw new TopLoggerError('api', 'This log is no longer on TopLogger. Refresh and try again.')
  }
  return deleteLogs(call, gymId, userId, routeId, [id], 'Could not confirm whether the log was removed. Check TopLogger before trying again.')
}

export async function voteGrade(call: Call, gymId: string, userId: string, routeId: string, grade: unknown) {
  if (typeof grade !== 'number' || !VOTABLE_GRADES.includes(grade)) {
    throw new TopLoggerError('api', 'Choose a valid French grade.')
  }
  return uncertain('Could not confirm whether your grade was saved. Check TopLogger before trying again.', async () => {
    const data = await call<{ climbUsers: unknown[] }>(GRADE_VOTE, { gymId: validId(gymId, 'gym'), userId, climbIds: [validId(routeId, 'route')], grade })
    const updated = data.climbUsers?.find(validClimbUser)
    if (!updated || updated.climbId !== routeId || updated.grade !== grade) {
      throw new TopLoggerError('network', 'Incomplete grade response.')
    }
    return updated
  })
}
