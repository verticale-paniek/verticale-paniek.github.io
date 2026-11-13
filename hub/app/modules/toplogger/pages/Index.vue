<template>
  <section class="pb-20">
    <TlTabs />

    <div class="flex items-center gap-2">
      <h1 class="flex-1 text-2xl font-semibold tracking-tight">
        Routes
      </h1>
      <select
        v-if="gyms.length > 1"
        class="min-h-11 min-w-0 max-w-[55%] rounded-xl border border-outline bg-bg px-3 text-sm"
        aria-label="Selected gym"
        :value="state.gymId"
        @change="selectGym(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="gym in gyms"
          :key="gym.id"
          :value="gym.id"
        >
          {{ gym.name }}
        </option>
      </select>
      <button
        class="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
        aria-label="Refresh routes"
        :disabled="state.busy || viewer.busy.value || state.needsConnect"
        @click="refreshView"
      >
        <Icon
          name="lucide:refresh-cw"
          :class="{ 'animate-spin': state.busy || viewer.busy.value }"
          aria-hidden="true"
        />
      </button>
    </div>

    <p
      v-if="state.needsConnect"
      class="my-6 rounded-xl border border-outline/50 bg-surface p-4"
      role="status"
    >
      TopLogger is not connected. <NuxtLink
        class="font-semibold text-accent underline"
        to="/account#toplogger"
      >
        Connect your account
      </NuxtLink> to see the routes.
    </p>
    <p
      v-if="state.error"
      class="my-4 text-error"
      role="alert"
    >
      {{ state.error }} <button
        class="underline"
        @click="refresh"
      >
        Retry
      </button>
    </p>
    <p
      v-if="state.cacheWarning"
      class="my-2 text-xs text-muted"
      role="status"
    >
      Device storage is full: these routes won't be available offline.
    </p>

    <template v-if="!state.needsConnect">
      <OverrideBanner
        v-if="viewer.selected.value"
        :name="viewer.name.value"
        :busy="viewer.busy.value"
        :error="viewer.error.value"
        @exit="viewer.exit"
        @retry="viewer.refresh"
      />
      <div
        class="mt-4 flex gap-1 rounded-xl border border-outline/50 bg-surface p-1"
        role="group"
        aria-label="Route filters"
      >
        <button
          v-for="tab in completion"
          :key="tab.id"
          class="min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-accent"
          :class="status === tab.id ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'"
          :aria-pressed="status === tab.id"
          @click="status = tab.id"
        >
          {{ tab.title }} <span class="tabular-nums opacity-70">{{ tab.count }}</span>
        </button>
      </div>

      <div class="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
        <p class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted" role="status">
          <strong class="text-sm font-semibold text-text">{{ filtered.length }} {{ filtered.length === 1 ? 'route' : 'routes' }} shown</strong>
          <span>{{ selectedWalls.length === 1 ? selectedWalls[0] : selectedWalls.length ? `${selectedWalls.length} walls selected` : 'All walls' }}<template v-if="status"> · {{ statusLabels[status] }}</template></span>
        </p>
        <button
          ref="viewButton"
          class="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="state.view === 'list' ? 'Switch to map view' : 'Switch to list view'"
          @click="state.view = state.view === 'list' ? 'map' : 'list'"
        >
          <Icon :name="state.view === 'list' ? 'lucide:map' : 'lucide:list'" aria-hidden="true" />
          {{ state.view === 'list' ? 'Map' : 'List' }}
        </button>
        <button
          ref="filtersButton"
          class="relative grid size-11 shrink-0 place-items-center rounded-lg border border-outline text-lg focus-visible:outline-2 focus-visible:outline-accent"
          :class="showFilters || filterCount ? 'bg-accent/10 text-accent' : 'text-muted'"
          :aria-label="filterCount ? `Filters, ${filterCount} active` : 'Filters'"
          title="Filters"
          :aria-expanded="showFilters"
          aria-controls="filters"
          @click="showFilters = !showFilters"
        >
          <Icon name="lucide:sliders-horizontal" aria-hidden="true" />
          <span v-if="filterCount" class="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" aria-hidden="true" />
        </button>
      </div>

      <div v-if="gradeFiltered" class="mb-3 flex flex-wrap gap-2">
        <button class="flex min-h-11 items-center gap-2 rounded-full bg-accent/10 px-3 text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent" :aria-label="`Clear grade filter: ${gradeSummary}`" @click="resetGrades">
          {{ gradeSummary }}
          <Icon name="lucide:x" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="showFilters"
        id="filters"
        class="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-outline/50 bg-surface p-3 text-sm"
      >
        <button
          class="col-span-2 min-h-11 rounded-lg bg-accent px-3 font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          @click="showFilters = false; filtersButton?.focus()"
        >
          Show {{ filtered.length }} {{ filtered.length === 1 ? 'route' : 'routes' }}
        </button>
        <label class="col-span-2 grid gap-1.5 font-semibold">View progress for
          <select :value="viewer.selected.value?.id || ''" class="min-h-11 w-full min-w-0 rounded-lg border border-outline bg-bg px-2 font-normal" @change="viewer.select(($event.target as HTMLSelectElement).value)">
            <option value="">Me (my progress)</option>
            <option v-for="climber in viewer.climbers.value.filter(c => c.id !== state.profile?.id)" :key="climber.id" :value="climber.id">{{ climber.fullName || 'Unnamed climber' }}</option>
          </select>
          <span v-if="viewer.loadingClimbers.value" class="text-xs font-normal text-muted" role="status">Loading climbers…</span>
        </label>
        <p v-if="viewer.climbersError.value" class="col-span-2 text-error" role="alert">
          {{ viewer.climbersError.value }} <button class="min-h-11 underline" @click="viewer.loadClimbers">
            Retry
          </button>
        </p>
        <fieldset class="col-span-2 m-0 min-w-0 rounded-xl border border-outline/50 p-4">
          <legend class="px-1 font-semibold">
            Grades
          </legend>
          <div class="flex items-center justify-between gap-3">
            <span class="text-base font-semibold tabular-nums" aria-live="polite">{{ gradeSummary }}</span>
            <button class="min-h-11 px-2 text-accent disabled:text-muted" :disabled="!gradeFiltered" @click="resetGrades">
              Reset
            </button>
          </div>
          <div class="mt-1 flex justify-between text-xs text-muted">
            <span>Min <strong class="ml-1 text-text">{{ frenchGrade(gradeScale[gradeRange[0]!]) }}</strong></span>
            <span>Max <strong class="ml-1 text-text">{{ frenchGrade(gradeScale[gradeRange[1]!]) }}</strong></span>
          </div>
          <SliderRoot
            v-model="gradeRange"
            :min="0"
            :max="gradeScale.length - 1"
            :step="1"
            :min-steps-between-thumbs="0"
            :disabled="filters.ungraded === 'only'"
            class="relative flex h-12 w-full touch-none select-none items-center data-[disabled]:opacity-35"
          >
            <SliderTrack class="relative h-1.5 grow rounded-full bg-outline/40">
              <SliderRange class="absolute h-full rounded-full bg-accent" />
            </SliderTrack>
            <SliderThumb aria-label="Minimum grade" :aria-valuetext="frenchGrade(gradeScale[gradeRange[0]!])" class="relative block size-6 rounded-full border-2 border-accent bg-surface shadow-sm after:absolute after:-inset-2.5 after:rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
            <SliderThumb aria-label="Maximum grade" :aria-valuetext="frenchGrade(gradeScale[gradeRange[1]!])" class="relative block size-6 rounded-full border-2 border-accent bg-surface shadow-sm after:absolute after:-inset-2.5 after:rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
          </SliderRoot>
          <label class="mt-2 flex min-h-11 items-center justify-between gap-3 border-t border-outline/50 pt-3">
            <span class="text-muted">Ungraded <strong class="text-text">?</strong></span>
            <select v-model="filters.ungraded" class="min-h-11 rounded-lg border border-outline bg-bg px-3 text-sm">
              <option value="include">Include</option>
              <option value="exclude">Hide</option>
              <option value="only">Only ungraded</option>
            </select>
          </label>
        </fieldset>
        <details class="col-span-2 min-w-0">
          <summary class="min-h-11 cursor-pointer content-center rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-accent">
            Walls · {{ selectedWalls.length ? `${selectedWalls.length} selected` : 'All walls' }}
          </summary>
          <fieldset class="m-0 min-w-0 border-0 p-0">
            <legend class="sr-only">
              Walls
            </legend>
            <button
              class="min-h-11 text-accent"
              :aria-pressed="!selectedWalls.length"
              @click="allWalls"
            >
              All walls
            </button>
            <div class="flex flex-wrap gap-x-4">
              <label
                v-for="value in walls"
                :key="value"
                class="flex min-h-11 items-center gap-2"
              >
                <input
                  v-model="selectedWalls"
                  class="size-4.5 accent-accent"
                  type="checkbox"
                  :value="value"
                  @change="filters.wallsChosen = true"
                >
                {{ value }}
              </label>
            </div>
          </fieldset>
        </details>
        <button
          class="col-span-2 min-h-11 text-left text-accent"
          @click="resetAll"
        >
          Reset filters
        </button>
      </div>

      <DialogRoot :open="state.view === 'map'" @update:open="state.view = $event ? 'map' : 'list'">
        <DialogPortal>
          <DialogOverlay class="fixed inset-0 z-40 bg-bg" />
          <DialogContent
            class="fixed inset-0 z-50 flex h-dvh flex-col bg-bg pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] focus:outline-none"
            @close-auto-focus.prevent="viewButton?.focus()"
          >
            <header class="flex shrink-0 items-center gap-3 border-b border-outline/50 bg-surface px-3 py-2 sm:px-5">
              <DialogClose class="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-accent transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent">
                <Icon name="lucide:list" aria-hidden="true" />
                Back to list
              </DialogClose>
              <div class="min-w-0 flex-1 text-right">
                <DialogTitle class="truncate text-sm font-semibold">
                  {{ gyms.find(g => g.id === state.gymId)?.name || 'Gym map' }}
                </DialogTitle>
                <p class="text-xs text-muted" role="status">
                  {{ filtered.length }} {{ filtered.length === 1 ? 'route' : 'routes' }} shown
                </p>
              </div>
            </header>
            <DialogDescription class="sr-only">
              Fullscreen gym map with your current route filters. Drag to pan, pinch or scroll to zoom. Use Back to list or Escape to return to the route list.
            </DialogDescription>
            <OverrideBanner
              v-if="viewer.selected.value"
              :name="viewer.name.value"
              :busy="viewer.busy.value"
              :error="viewer.error.value"
              @exit="viewer.exit"
              @retry="viewer.refresh"
            />
            <GymMap
              :key="`${state.gymId}:${gyms.find(g => g.id === state.gymId)?.floorplanPath ?? ''}`"
              :navigation="mapNavigation"
              :floorplan-path="gyms.find(g => g.id === state.gymId)?.floorplanPath"
              :routes="filtered"
              :read-only="!!viewer.selected.value"
              fullscreen
              @show-list="state.view = 'list'"
            />
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <ul v-if="state.view === 'list'" class="m-0 list-none p-0">
        <RouteCard
          v-for="route in filtered"
          :key="route.id"
          :route="route"
          :read-only="!!viewer.selected.value"
        />
      </ul>
      <div
        v-if="!filtered.length"
        class="py-8 text-center text-muted"
      >
        <p role="status">
          {{ (state.busy || viewer.busy.value) ? 'Fetching the latest from TopLogger…' : filterCount ? 'No matching routes. Try clearing your filters.' : 'No routes to show.' }}
        </p>
        <div v-if="!state.busy" class="mt-3 flex flex-wrap justify-center gap-2">
          <button
            v-if="filterCount"
            class="min-h-11 rounded-xl border border-outline px-4 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent"
            @click="resetAll(); filtersButton?.focus()"
          >
            Reset filters
          </button>
        </div>
      </div>

      <p
        v-if="!viewer.selected.value"
        class="mt-6 text-xs text-muted"
        role="status"
      >
        {{ state.busy ? 'Syncing with TopLogger…' : synced ? `Last synced ${synced}` : 'Not synced yet' }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import OverrideBanner from '../components/OverrideBanner.vue'
import { useRouteViewer } from '../useRouteViewer'
import { toploggerCall } from '~/shell/toplogger/api'
import RouteCard from '../components/RouteCard.vue'
import GymMap from '../components/GymMap.vue'
import TlTabs from '../components/TlTabs.vue'
import { matchesGrades } from '../utils/filters'
import { useTopLogger } from '../useTopLogger'
import { FRENCH_GRADES, defaultWallSelection, frenchGrade, isNewRoute, isActive } from '~/shell/toplogger/domain'

const { state, filters, gyms, activeRoutes: ownRoutes, load, refresh, selectGym, resetFilters, mapNavigation } = useTopLogger()

const supabase = useSupabase()
const viewer = useRouteViewer(computed(() => `${state.account}:${state.gymId}`), toRef(state, 'gymId'), body => toploggerCall(supabase, body))
const activeRoutes = computed(() => viewer.selected.value ? viewer.routes.value.filter(r => isActive(r)) : ownRoutes.value)
function refreshView() {
  return viewer.selected.value ? viewer.refresh() : refresh()
}
watch([() => filters.showFilters, () => state.gymId, () => state.account], () => {
  if (filters.showFilters) {
    void viewer.loadClimbers()
  }
}, { immediate: true })

const { showFilters, status, walls: selectedWalls } = toRefs(filters)
const filtersButton = useTemplateRef<HTMLButtonElement>('filtersButton')
const viewButton = useTemplateRef<HTMLButtonElement>('viewButton')
const statusLabels: Record<string, string> = { todo: 'To do', new: 'New (last 14 days)' }

const sorted = computed(() => [...activeRoutes.value].sort((a, b) =>
  a.grade - b.grade
  || (a.wall?.nameLoc || '').localeCompare(b.wall?.nameLoc || '')
  || (a.label || '').localeCompare(b.label || '', undefined, { numeric: true })))

const filtered = computed(() => {
  return sorted.value.filter((route) => {
    const matchesStatus = !status.value
      || (status.value === 'new' ? isNewRoute(route.inAt) : !route.climbUser?.tickType)
    return matchesGrades(route.grade, filters)
      && (!selectedWalls.value.length || selectedWalls.value.includes(route.wall?.nameLoc || ''))
      && matchesStatus
  })
})

const gradeScale = FRENCH_GRADES
const gradeRange = computed({
  get: () => [filters.gradeMin === null ? 0 : gradeScale.indexOf(filters.gradeMin), filters.gradeMax === null ? gradeScale.length - 1 : gradeScale.indexOf(filters.gradeMax)],
  set: (values: number[] | undefined) => {
    if (!values || values.length !== 2) {
      return
    }
    filters.gradeMin = values[0] === 0 ? null : gradeScale[values[0]!] ?? null
    filters.gradeMax = values[1] === gradeScale.length - 1 ? null : gradeScale[values[1]!] ?? null
  },
})
const gradeFiltered = computed(() => filters.gradeMin !== null || filters.gradeMax !== null || filters.ungraded !== 'include')
const gradeSummary = computed(() => {
  if (filters.ungraded === 'only') {
    return 'Ungraded (?) only'
  }
  const min = frenchGrade(gradeScale[gradeRange.value[0]!])
  const max = frenchGrade(gradeScale[gradeRange.value[1]!])
  const range = filters.gradeMin === null && filters.gradeMax === null ? 'All grades' : min === max ? min : `${min}–${max}`
  return `${range}${filters.ungraded === 'include' ? ' + ?' : ''}`
})
function resetGrades() {
  Object.assign(filters, { gradeMin: null, gradeMax: null, ungraded: 'include' })
}
const walls = computed(() => [...new Set(activeRoutes.value.flatMap(r => r.wall?.nameLoc ? [r.wall.nameLoc] : []))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
const filterCount = computed(() => [gradeFiltered.value, selectedWalls.value.length, status.value, viewer.selected.value].filter(Boolean).length)
const topped = computed(() => activeRoutes.value.filter(r => (r.climbUser?.tickType || 0) > 0).length)
const completion = computed(() => [
  { id: '', title: 'All', count: activeRoutes.value.length },
  { id: 'todo', title: 'To do', count: activeRoutes.value.length - topped.value },
  { id: 'new', title: 'New', count: activeRoutes.value.filter(r => isNewRoute(r.inAt)).length },
])
const synced = computed(() => state.syncedAt
  ? new Date(state.syncedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '')

// The gym's default walls (Klimax: sectors 1 to 7) apply until the climber chooses walls themselves.
watch([() => state.gymId, walls], () => {
  if (!filters.wallsChosen) {
    selectedWalls.value = defaultWallSelection(gyms.value.find(g => g.id === state.gymId)?.name || '', walls.value)
  }
}, { immediate: true })

function resetAll() {
  viewer.exit()
  resetFilters()
  allWalls()
}

function allWalls() {
  filters.wallsChosen = true
  selectedWalls.value = []
}

onMounted(load)
</script>
