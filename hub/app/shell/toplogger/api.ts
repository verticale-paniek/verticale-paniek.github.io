import type { SupabaseClient } from '@supabase/supabase-js'
import type { Ascent, ClimbUser, Community, Gym, Route, RouteLog } from './domain'

export interface ConnectionState {
  connected: boolean
  status: 'connected' | 'reconnect_required' | 'not_connected'
  refreshExpiresAt?: string
  lastError?: string | null
  /** When the connection was last connected or refreshed (or last failed). */
  updatedAt?: string
}

export interface Profile {
  id: string
  fullName: string
  gym: Gym | null
  gymUserFavorites: { gym: Gym }[]
}

/** Route screen payload. `logs` and `community` are null when TopLogger could not provide them. */
export interface RouteDetail {
  route: Route
  logs: RouteLog[] | null
  community: Community | null
}

/** Result of a log, unsend or delete: the route's new progress and (if available) its refreshed logs. */
export interface WriteResult {
  climbUser: ClimbUser | null
  logs: RouteLog[] | null
}

export interface VoteResult {
  climbUser: ClimbUser
  stats: Pick<Community, 'gradeVoteStats' | 'ratingVoteStats'> | null
}

/** Top 10 history: one entry per topped route per session day, and the routes behind them (including removed ones). */
export interface HistoryResult {
  logs: Ascent[]
  routes: Route[]
}

/** Home screen payload: the profile, the gym the server chose, and that gym's routes. */
export interface Home {
  profile: Profile
  gymId: string
  routes: Route[]
}

export type TopLoggerRequest
  = | { action: 'status' }
    | { action: 'connect', refreshToken: string }
    | { action: 'disconnect' }
    | { action: 'profile' }
    | { action: 'routes', gymId?: string }
    | { action: 'history', gymId: string }
    | { action: 'routeDetail', gymId: string, routeId: string }
    | { action: 'logAscent', gymId: string, routeId: string, tickType: 0 | 1 | 2 | 3, climbedAtDate: string }
    | { action: 'unsend', gymId: string, routeId: string }
    | { action: 'deleteLog', gymId: string, routeId: string, logId: string }
    | { action: 'vote', gymId: string, routeId: string, grade: number }

/** Error from the toplogger function; `code` is e.g. not_connected, reconnect_required, invalid_token. */
export class TopLoggerApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
  }
}

/** Calls the toplogger Edge Function, surfacing its error message and code when it sends them. */
export async function toploggerCall<T>(supabase: SupabaseClient, body: TopLoggerRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('toplogger', { body })
  if (error) {
    let message = error.message
    let code: string | undefined
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const payload = await context.json().catch(() => null)
      if (payload?.error) {
        message = payload.error
      }
      code = payload?.code
    }
    throw new TopLoggerApiError(message, code)
  }
  return data as T
}
