// Module state shared by every TopLogger page: profile, selected gym and its routes. Cached snapshots show
// immediately; the server (the `toplogger` Edge Function) is asked in the background.
import { computed, reactive } from 'vue'
import { toploggerCall, TopLoggerApiError, type Home, type Profile } from './api'
import { cacheKey, clearCache, readCache, writeCache } from './utils/cache'
import { isActive, type Route } from './utils/domain'

interface RouteSnapshot { gymId: string, routes: Route[] }

const state = reactive({
  account: '',
  profile: null as Profile | null,
  gymId: '',
  routes: [] as Route[],
  syncedAt: '',
  busy: false,
  error: '',
  /** True when TopLogger is not connected (or the connection expired): data screens point to the account page. */
  needsConnect: false,
  cacheWarning: false,
})
let request = 0

function save(kind: string, scope: string, data: unknown): string {
  const at = writeCache(cacheKey(state.account, scope, kind), data)
  if (!at) {
    state.cacheWarning = true
  }
  return at ?? new Date().toISOString()
}

function loadCached(account: string): void {
  Object.assign(state, { account, profile: null, gymId: '', routes: [], syncedAt: '', error: '', needsConnect: false, cacheWarning: false })
  const profile = readCache<Profile>(cacheKey(account, '_', 'profile'))
  const gym = readCache<string>(cacheKey(account, '_', 'gym'))
  if (profile) {
    state.profile = profile.data
    state.gymId = gym?.data ?? ''
  }
  const routes = readCache<RouteSnapshot>(cacheKey(account, state.gymId || '_', 'routes'))
  if (routes && routes.data.gymId === state.gymId) {
    state.routes = routes.data.routes
    state.syncedAt = routes.at
  }
}

function apply(home: Home): void {
  state.profile = home.profile
  state.gymId = home.gymId
  state.routes = home.routes
  state.needsConnect = false
  state.syncedAt = save('routes', home.gymId, { gymId: home.gymId, routes: home.routes } satisfies RouteSnapshot)
  save('profile', '_', home.profile)
  save('gym', '_', home.gymId)
}

async function refresh(supabase: Parameters<typeof toploggerCall>[0], gymId = state.gymId): Promise<void> {
  const id = ++request
  state.busy = true
  state.error = ''
  state.cacheWarning = false
  try {
    const home = await toploggerCall<Home>(supabase, { action: 'routes', ...(gymId ? { gymId } : {}) })
    if (id === request) {
      apply(home)
    }
  }
  catch (e) {
    if (id !== request) {
      return
    }
    if (e instanceof TopLoggerApiError && (e.code === 'not_connected' || e.code === 'reconnect_required')) {
      state.needsConnect = true
    }
    else {
      state.error = e instanceof Error ? e.message : 'Something went wrong.'
    }
  }
  finally {
    if (id === request) {
      state.busy = false
    }
  }
}

export function useTopLogger() {
  const supabase = useSupabase()
  const { user } = useAuth()

  const gyms = computed(() => {
    const p = state.profile
    const all = [...(p?.gym ? [p.gym] : []), ...(p?.gymUserFavorites ?? []).map(f => f.gym)]
    return [...new Map(all.map(g => [g.id, g])).values()]
  })
  const activeRoutes = computed(() => state.routes.filter(r => isActive(r)))

  /** Shows the cached snapshot for this account at once, then refreshes. Safe to call on every page mount. */
  async function load(): Promise<void> {
    const account = user.value?.id ?? ''
    if (state.account !== account) {
      loadCached(account)
    }
    if (!state.busy && (!state.syncedAt || Date.now() - Date.parse(state.syncedAt) > 60_000)) {
      await refresh(supabase)
    }
  }

  async function selectGym(gymId: string): Promise<void> {
    if (gymId === state.gymId || !gyms.value.some(g => g.id === gymId)) {
      return
    }
    request++
    state.gymId = gymId
    state.routes = []
    state.syncedAt = ''
    save('gym', '_', gymId)
    const cached = readCache<RouteSnapshot>(cacheKey(state.account, gymId, 'routes'))
    if (cached) {
      state.routes = cached.data.routes
      state.syncedAt = cached.at
    }
    await refresh(supabase, gymId)
  }

  /** After connecting, disconnecting or reconnecting: forget what we show and start over. */
  function reset(): void {
    request++
    clearCache(state.account)
    loadCached(state.account)
    state.busy = false
  }

  return { state, gyms, activeRoutes, load, refresh: () => refresh(supabase), selectGym, reset }
}
