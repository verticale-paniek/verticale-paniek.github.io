// TopLogger operations behind the `toplogger` Edge Function. Each takes a `Call` (already bound to one user's
// access token) so they stay free of storage and can be tested with a fake. Results keep TopLogger's shapes;
// presentation logic lives in the PWA module.
import { TopLoggerError, USER } from './graphql.ts'
import { ROUTES } from './queries.ts'

export type Call = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>

interface Page<T> {
  data: T[]
  pagination: { total: number, page: number, perPage: number }
}

const PER_PAGE = 100 // TopLogger rejects larger pages
const MAX_PAGES = 50

const ID = /^[\w-]{1,40}$/

export function validId(value: unknown, what: string): string {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new TopLoggerError('api', `Invalid ${what}.`)
  }
  return value
}

/** Collects every page of a paginated field, refusing incomplete or inconsistent pagination. */
export async function pages<T>(call: Call, query: string, field: string, variables: Record<string, unknown>): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await call<Record<string, Page<T> | undefined>>(query, { ...variables, pagination: { page, perPage: PER_PAGE } })
    const result = response[field]
    const p = result?.pagination
    if (!result || !Array.isArray(result.data) || !p || p.page !== page || !(p.perPage > 0) || !Number.isFinite(p.total)) {
      throw new TopLoggerError('api', 'TopLogger returned incomplete pagination.')
    }
    all.push(...result.data)
    if (page * p.perPage >= p.total) {
      return all
    }
    if (!result.data.length) {
      throw new TopLoggerError('api', 'TopLogger returned incomplete data.')
    }
  }
  throw new TopLoggerError('api', 'TopLogger returned too much data.')
}

export interface RouteRecord {
  id: string
  grade: number
  [key: string]: unknown
}

/** Every route at a gym with this user's progress on it. */
export async function fetchRoutes(call: Call, gymId: unknown, userId: string): Promise<RouteRecord[]> {
  const routes = await pages<RouteRecord>(call, ROUTES, 'climbs', { gymId: validId(gymId, 'gym'), userId })
  if (routes.some(r => !r || typeof r.id !== 'string' || !Number.isFinite(r.grade))) {
    throw new TopLoggerError('api', 'TopLogger returned incomplete route data.')
  }
  return routes
}

export interface Gym {
  id: string
  name: string
}

export interface Profile {
  id: string
  fullName: string
  gym: Gym | null
  gymUserFavorites: { gym: Gym }[]
}

/** The gyms a user can pick: their home gym first, then favorites, without duplicates. */
export function gymsOf(profile: Profile): Gym[] {
  const all = [...(profile.gym ? [profile.gym] : []), ...profile.gymUserFavorites.map(f => f.gym)]
  return [...new Map(all.map(g => [g.id, g])).values()]
}

/** The requested gym if the user has it, else their home gym, else the first favorite. */
export function pickGym(profile: Profile, requested: unknown): string {
  const gyms = gymsOf(profile)
  return gyms.find(g => g.id === requested)?.id ?? gyms[0]?.id ?? ''
}

export async function fetchProfile(call: Call): Promise<Profile> {
  const { userMe } = await call<{ userMe: Profile | null }>(USER)
  if (!userMe || typeof userMe.id !== 'string' || !Array.isArray(userMe.gymUserFavorites)) {
    throw new TopLoggerError('api', 'TopLogger returned an incomplete profile.')
  }
  return userMe
}

/** One round trip for the home screen: profile, the chosen gym and its routes. */
export async function fetchHome(call: Call, requestedGym: unknown, cachedProfile?: Profile) {
  const profile = cachedProfile ?? await fetchProfile(call)
  const gymId = pickGym(profile, requestedGym)
  if (!gymId) {
    throw new TopLoggerError('api', 'No gym on your TopLogger account.')
  }
  return { profile, gymId, routes: await fetchRoutes(call, gymId, profile.id) }
}
