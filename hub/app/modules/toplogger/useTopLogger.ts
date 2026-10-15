// Module state shared by every TopLogger page: profile, selected gym, its routes, the route being viewed and the
// list filters. Cached snapshots show immediately; the server (the `toplogger` Edge Function) is asked in the
// background. Everything the phone sends is a coarse action; TopLogger rules are enforced server-side.
import { computed, reactive } from 'vue'
import {
  toploggerCall, TopLoggerApiError,
  type Home, type Profile, type RouteDetail, type VoteResult, type WriteResult,
} from './api'
import { cacheKey, clearCache, readCache, writeCache } from './utils/cache'
import { dayLabel, isActive, visibleLogs, type ClimbUser, type Community, type Route, type RouteLog } from './utils/domain'

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
  /** True while the climber is inside the module. The list refetches on entering it, not when moving between its tabs. */
  entered: false,
})

/** List filters live here (not in the page) so they survive opening a route and coming back. */
const filters = reactive({
  search: '',
  showFilters: false,
  grade: '',
  color: '',
  status: '',
  walls: [] as string[],
  /** Once the climber picks walls (or "all walls") themselves, the gym's default selection stops applying. */
  wallsChosen: false,
})

const detail = reactive({
  routeId: '',
  route: null as Route | null,
  logs: null as RouteLog[] | null,
  community: null as Community | null,
  loading: false,
  error: '',
  logsFailed: false,
  communityFailed: false,
  /** What is being written right now, e.g. "ascent:1", "log:abc", "grade:650". Empty when idle. */
  action: '',
  actionError: '',
  /** Set when a write succeeded; the page turns it into an Adventure notice later. */
  lastWrite: null as null | { kind: 'ascent' | 'unsend' | 'delete' | 'vote', routeId: string, before: ClimbUser | null, after: ClimbUser | null },
})

let request = 0
let detailRequest = 0

function save(kind: string, scope: string, data: unknown): string {
  const at = writeCache(cacheKey(state.account, scope, kind), data)
  if (!at) {
    state.cacheWarning = true
  }
  return at ?? new Date().toISOString()
}

function loadCached(account: string): void {
  Object.assign(state, { account, profile: null, gymId: '', routes: [], syncedAt: '', error: '', needsConnect: false, cacheWarning: false, entered: false })
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

function resetFilters(): void {
  Object.assign(filters, { search: '', grade: '', color: '', status: '', walls: [], wallsChosen: false })
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

type Supabase = Parameters<typeof toploggerCall>[0]

/** Records connection problems for the screens; returns the message to show for anything else. */
function describe(e: unknown): string {
  if (e instanceof TopLoggerApiError && (e.code === 'not_connected' || e.code === 'reconnect_required')) {
    state.needsConnect = true
    return 'Your TopLogger connection needs to be set up again.'
  }
  return e instanceof Error ? e.message : 'Something went wrong.'
}

async function refresh(supabase: Supabase, gymId = state.gymId): Promise<void> {
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
    if (id === request) {
      const message = describe(e)
      if (!state.needsConnect) {
        state.error = message
      }
    }
  }
  finally {
    if (id === request) {
      state.busy = false
    }
  }
}

/** Replaces one route's progress everywhere we keep it (memory, the open route screen, the offline snapshot). */
function applyClimbUser(routeId: string, climbUser: ClimbUser | null): void {
  state.routes = state.routes.map(r => r.id === routeId ? { ...r, climbUser } : r)
  save('routes', state.gymId, { gymId: state.gymId, routes: state.routes } satisfies RouteSnapshot)
  if (detail.route?.id === routeId) {
    detail.route = { ...detail.route, climbUser }
  }
}

/** Today in the climber's own time zone, which is the day TopLogger records the ascent on. */
function localDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

let watchingLeave = false

export function useTopLogger() {
  const supabase = useSupabase()
  const { user } = useAuth()

  if (!watchingLeave) {
    watchingLeave = true
    useRouter().afterEach((to) => {
      if (to.path !== '/toplogger' && !to.path.startsWith('/toplogger/')) {
        state.entered = false
      }
    })
  }

  const gyms = computed(() => {
    const p = state.profile
    const all = [...(p?.gym ? [p.gym] : []), ...(p?.gymUserFavorites ?? []).map(f => f.gym)]
    return [...new Map(all.map(g => [g.id, g])).values()]
  })
  // Deduped by id as well: list keys must be unique, and older cached snapshots may hold duplicates.
  const activeRoutes = computed(() => [...new Map(state.routes.filter(r => isActive(r)).map(r => [r.id, r])).values()])

  /** Shows this account's cached snapshot at once, then refreshes when the climber has just entered the module. */
  async function load(): Promise<void> {
    const account = user.value?.id ?? ''
    if (state.account !== account) {
      loadCached(account)
    }
    if (state.entered) {
      return
    }
    state.entered = true
    if (!state.busy) {
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
    resetFilters()
    save('gym', '_', gymId)
    const cached = readCache<RouteSnapshot>(cacheKey(state.account, gymId, 'routes'))
    if (cached) {
      state.routes = cached.data.routes
      state.syncedAt = cached.at
    }
    await refresh(supabase, gymId)
  }

  /** After connecting or disconnecting: forget what we show and start over. */
  function reset(): void {
    request++
    detailRequest++
    clearCache(state.account)
    loadCached(state.account)
    state.busy = false
    resetFilters() // loadCached cleared `entered`, so the next visit to the list refetches
  }

  // ---- Route screen ----------------------------------------------------------------------------------------

  /** Opens a route: shows what the list already knows at once, then loads logs and community in one round trip. */
  async function openRoute(routeId: string): Promise<void> {
    const id = ++detailRequest
    if (state.account !== (user.value?.id ?? '')) {
      loadCached(user.value?.id ?? '')
    }
    Object.assign(detail, {
      routeId,
      route: state.routes.find(r => r.id === routeId) ?? null,
      logs: null,
      community: null,
      error: '',
      logsFailed: false,
      communityFailed: false,
      actionError: '',
      lastWrite: null,
      loading: true,
    })
    if (!state.gymId) {
      detail.loading = false
      detail.error = 'Open the route list first.'
      return
    }
    try {
      const result = await toploggerCall<RouteDetail>(supabase, { action: 'routeDetail', gymId: state.gymId, routeId })
      if (id !== detailRequest) {
        return
      }
      detail.route = result.route
      detail.logs = result.logs ? visibleLogs(result.logs) : null
      detail.logsFailed = !result.logs
      detail.community = result.community
      detail.communityFailed = !result.community
      applyClimbUser(routeId, result.route.climbUser)
    }
    catch (e) {
      if (id === detailRequest) {
        detail.error = describe(e)
      }
    }
    finally {
      if (id === detailRequest) {
        detail.loading = false
      }
    }
  }

  /** Runs one write on the open route. Only one at a time; the server enforces that too. */
  async function write<T>(action: string, work: () => Promise<T>, done: (result: T) => void): Promise<void> {
    if (!detail.route || detail.action || state.busy) {
      return
    }
    const id = detailRequest
    detail.action = action
    detail.actionError = ''
    detail.lastWrite = null
    try {
      const result = await work()
      if (id === detailRequest) {
        done(result)
      }
    }
    catch (e) {
      if (id === detailRequest) {
        detail.actionError = describe(e)
      }
    }
    finally {
      detail.action = ''
    }
  }

  function afterLogWrite(kind: 'ascent' | 'unsend' | 'delete', routeId: string, before: ClimbUser | null, result: WriteResult): void {
    applyClimbUser(routeId, result.climbUser)
    if (result.logs) {
      detail.logs = visibleLogs(result.logs)
      detail.logsFailed = false
    }
    else {
      detail.logsFailed = true
    }
    detail.lastWrite = { kind, routeId, before, after: result.climbUser }
  }

  /** Try (0), redpoint (1), flash (2) or onsight (3). Repeats are redpoints on an already topped route. */
  function submitAscent(tickType: 0 | 1 | 2 | 3): Promise<void> {
    const route = detail.route
    if (!route) {
      return Promise.resolve()
    }
    const repeat = tickType > 0 && !!route.climbUser?.tickType
    return write(`ascent:${repeat ? 'repeat' : tickType}`,
      () => toploggerCall<WriteResult>(supabase, { action: 'logAscent', gymId: state.gymId, routeId: route.id, tickType, climbedAtDate: localDay() }),
      result => afterLogWrite('ascent', route.id, route.climbUser, result))
  }

  function unsend(): Promise<void> {
    const route = detail.route
    if (!route) {
      return Promise.resolve()
    }
    const tops = detail.logs ? detail.logs.filter(l => l.topped).length : route.climbUser?.totalTicks ?? 0
    if (tops > 1 && !window.confirm(`Remove ${tops} ascents?`)) {
      return Promise.resolve()
    }
    return write('ascent:-1',
      () => toploggerCall<WriteResult>(supabase, { action: 'unsend', gymId: state.gymId, routeId: route.id }),
      result => afterLogWrite('unsend', route.id, route.climbUser, result))
  }

  function deleteLog(log: RouteLog): Promise<void> {
    const route = detail.route
    if (!route) {
      return Promise.resolve()
    }
    const warnings: string[] = []
    // A route that left the wall cannot be logged again, so the deletion is permanent.
    if (route.outAt && Date.parse(route.outAt) <= Date.now()) {
      warnings.push(`This will remove your ${log.topped ? 'ascent' : 'try'} from ${dayLabel(log.climbedAtDate).replace(/^(Today|Yesterday)$/, day => day.toLowerCase())}. This cannot be undone.`)
    }
    if (log.topped && !log.tickIndex && detail.logs?.some(other => other.id !== log.id && other.topped)) {
      warnings.push('Your next ascent will become your first top.')
    }
    if (warnings.length && !window.confirm(warnings.join(' '))) {
      return Promise.resolve()
    }
    return write(`log:${log.id}`,
      () => toploggerCall<WriteResult>(supabase, { action: 'deleteLog', gymId: state.gymId, routeId: route.id, logId: log.id }),
      result => afterLogWrite('delete', route.id, route.climbUser, result))
  }

  function voteGrade(grade: number): Promise<void> {
    const route = detail.route
    if (!route || route.climbUser?.grade === grade) {
      return Promise.resolve()
    }
    return write(`grade:${grade}`,
      () => toploggerCall<VoteResult>(supabase, { action: 'vote', gymId: state.gymId, routeId: route.id, grade }),
      (result) => {
        applyClimbUser(route.id, result.climbUser)
        if (result.stats && detail.community) {
          detail.community = { ...detail.community, gradeVoteStats: result.stats.gradeVoteStats, ratingVoteStats: result.stats.ratingVoteStats }
        }
        detail.lastWrite = { kind: 'vote', routeId: route.id, before: route.climbUser, after: result.climbUser }
      })
  }

  return {
    state, filters, detail, gyms, activeRoutes,
    load, refresh: () => refresh(supabase), selectGym, reset, resetFilters,
    openRoute, submitAscent, unsend, deleteLog, voteGrade,
  }
}
