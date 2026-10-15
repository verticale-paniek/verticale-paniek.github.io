// Ascent history for the Top 10, in one TopLogger call: the climber's session days at a gym, each with the routes
// climbed that day and the tick type achieved, plus the routes' own details. Results are returned in the shape
// the PWA already scores (one "log" per route per day), so routes that have left the wall need no extra lookup.
import { TopLoggerError } from './graphql.ts'
import { type Call, pages, validId } from './ops.ts'
import { historyQuery } from './queries.ts'

export const HISTORY_DAYS = 180

export interface AscentRecord {
  id: string
  gymId: string
  climbId: string
  climbType: 'route'
  tickType: number
  climbedAtDate: string
  valid: true
  ticked: true
  topped: true
}

export interface HistoryRoute {
  id: string
  grade: number
  climbUser: null
  [key: string]: unknown
}

export interface HistoryResult {
  logs: AscentRecord[]
  /** Every route behind those logs, including routes that have left the wall. */
  routes: HistoryRoute[]
}

interface ClimbUserDay {
  id: string
  tickType: number
  climb: (HistoryRoute & { climbType?: unknown, gymId?: unknown }) | null
}

interface Day {
  id: string
  gymId: string
  statsAtDate: string
  climbUserDays: ClimbUserDay[]
}

export async function fetchHistory(call: Call, gymId: string, userId: string, now = new Date()): Promise<HistoryResult> {
  validId(gymId, 'gym')
  // One day wider than the window so the climber's own time zone never loses an edge day.
  const from = new Date(now)
  from.setUTCHours(0, 0, 0, 0)
  from.setUTCDate(from.getUTCDate() - HISTORY_DAYS - 1)

  const days = await pages<Day>(call, historyQuery(gymId), 'climbDaysPaginated', { userId, from: from.toISOString(), until: now.toISOString() })
  if (days.some(d => !d || typeof d.id !== 'string' || d.gymId !== gymId || !Number.isFinite(Date.parse(d.statsAtDate)) || !Array.isArray(d.climbUserDays))) {
    throw new TopLoggerError('api', 'TopLogger returned incomplete ascent history.')
  }

  const logs: AscentRecord[] = []
  const routes = new Map<string, HistoryRoute>()
  for (const day of days) {
    for (const item of day.climbUserDays) {
      const climb = item?.climb
      if (!climb || typeof climb.id !== 'string' || !Number.isFinite(climb.grade) || !Number.isFinite(item.tickType)) {
        throw new TopLoggerError('api', 'TopLogger returned incomplete ascent history.')
      }
      // Only routes of this gym that were topped that day can rank; attempts alone do not.
      if (item.tickType <= 0 || climb.climbType !== 'route' || climb.gymId !== gymId) {
        continue
      }
      const { climbType: _type, gymId: _gym, ...route } = climb
      routes.set(climb.id, { ...route, climbUser: null })
      logs.push({
        id: `${day.id}:${item.id}`,
        gymId,
        climbId: climb.id,
        climbType: 'route',
        tickType: item.tickType,
        climbedAtDate: day.statsAtDate,
        valid: true,
        ticked: true,
        topped: true,
      })
    }
  }
  return { logs, routes: [...routes.values()] }
}
