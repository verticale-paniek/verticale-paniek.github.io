import { computed, ref, watch, onScopeDispose, type Ref } from 'vue'
import type { Route } from '~/shell/toplogger/domain'
import type { TopLoggerRequest } from '~/shell/toplogger/api'

type Climber = { id: string, fullName: string | null }

/** Temporary, read-only perspective. Never writes to the signed-in user's shared state or cache. */
export function useRouteViewer(
  scope: Ref<string>,
  gymId: Ref<string>,
  call: <T>(body: TopLoggerRequest) => Promise<T>,
) {
  const climbers = ref<Climber[]>([])
  const selected = ref<Climber | null>(null)
  const routes = ref<Route[]>([])
  const busy = ref(false)
  const loadingClimbers = ref(false)
  const error = ref('')
  const climbersError = ref('')
  const loaded = ref(false)
  let request = 0
  let listRequest = 0

  function exit() {
    request++
    selected.value = null
    routes.value = []
    busy.value = false
    error.value = ''
  }

  async function loadClimbers() {
    if (!gymId.value || loaded.value || loadingClimbers.value) {
      return
    }
    const id = ++listRequest
    loadingClimbers.value = true
    climbersError.value = ''
    try {
      const result = await call<Climber[]>({ action: 'climbers', gymId: gymId.value })
      if (id !== listRequest) {
        return
      }
      climbers.value = result.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
      loaded.value = true
    }
    catch {
      if (id === listRequest) {
        climbersError.value = 'Could not load climbers. Try again.'
      }
    }
    finally {
      if (id === listRequest) {
        loadingClimbers.value = false
      }
    }
  }

  async function refresh() {
    if (!selected.value) {
      return
    }
    const id = ++request
    routes.value = []
    busy.value = true
    error.value = ''
    try {
      const result = await call<Route[]>({ action: 'viewingRoutes', gymId: gymId.value, viewingUserId: selected.value.id })
      if (id === request) {
        routes.value = result
      }
    }
    catch {
      if (id === request) {
        error.value = 'Could not load this climber’s progress. Retry or return to your own view.'
      }
    }
    finally {
      if (id === request) {
        busy.value = false
      }
    }
  }

  async function select(id: string) {
    exit()
    selected.value = climbers.value.find(climber => climber.id === id) ?? null
    await refresh()
  }

  watch(scope, () => {
    exit()
    listRequest++
    climbers.value = []
    loaded.value = false
    loadingClimbers.value = false
    climbersError.value = ''
  }, { flush: 'sync' })
  onScopeDispose(() => {
    request++
    listRequest++
  })

  return { climbers, selected, routes, busy, loadingClimbers, error, climbersError, loadClimbers, refresh, select, exit,
    name: computed(() => selected.value?.fullName || 'Unnamed climber') }
}
