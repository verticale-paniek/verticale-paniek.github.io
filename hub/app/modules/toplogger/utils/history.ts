// Client-side checks around the Top 10 history: whether a saved copy is usable and whether a ranking is trustworthy.
// The server fetches the history in one call; scoring itself is `topTen` in domain.ts.
import { dateValue, type Ascent, type Route } from './domain'

/** Longest Top 10 window; older ascents never matter. */
export const HISTORY_WINDOW_DAYS = 180

/** A saved history that still has the shape we expect (older app versions or corrupt storage may not). */
export function validAscents(value: unknown, gymId: string): Ascent[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const ok = value.every((l: Ascent) => l && typeof l.id === 'string' && l.gymId === gymId && typeof l.climbId === 'string'
    && typeof l.tickType === 'number' && Number.isFinite(Date.parse(l.climbedAtDate)))
  return ok ? value : null
}

/** True when every ascent that could rank has its route known; otherwise a ranking would silently be partial. */
export function canRank(logs: Ascent[], routes: Route[], gymId: string, now = Date.now()): boolean {
  const known = new Set(routes.map(r => r.id))
  const cutoff = now - (HISTORY_WINDOW_DAYS + 1) * 86400000
  return logs.every(l => l.gymId !== gymId || l.climbType !== 'route' || !l.valid || !l.ticked || !l.topped
    || dateValue(l.climbedAtDate) < cutoff || known.has(l.climbId))
}
