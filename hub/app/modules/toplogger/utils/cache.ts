// Stale-while-revalidate snapshots in localStorage, scoped per hub account so one shared phone never mixes users.
// Non-secret data only (routes, profile): TopLogger tokens never reach the browser.
const PREFIX = 'tlp:v1:'

export const cacheKey = (account: string, scope: string, kind: string) =>
  `${PREFIX}${encodeURIComponent(account)}:${encodeURIComponent(scope)}:${kind}`

export interface CacheEntry<T> {
  version: 1
  at: string
  data: T
}

export function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return null
    }
    const value = JSON.parse(raw)
    if (value?.version !== 1 || typeof value.at !== 'string' || !Number.isFinite(Date.parse(value.at)) || !('data' in value)) {
      return null
    }
    return value
  }
  catch {
    return null
  }
}

/** Replaces one complete snapshot; a failed write leaves the old one intact. Returns the save time, or null if storage is full. */
export function writeCache<T>(key: string, data: T): string | null {
  const at = new Date().toISOString()
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, at, data }))
    return at
  }
  catch {
    return null
  }
}

export function clearCache(account?: string): void {
  const prefix = account ? `${PREFIX}${encodeURIComponent(account)}:` : PREFIX
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    }
  }
  catch { /* storage unavailable: nothing to clear */ }
}
