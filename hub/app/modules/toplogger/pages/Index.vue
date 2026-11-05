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
        :disabled="state.busy || state.needsConnect"
        @click="refresh"
      >
        <Icon
          name="lucide:refresh-cw"
          :class="{ 'animate-spin': state.busy }"
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
      <p class="mb-1.5 mt-4 text-xs font-medium text-muted">
        All routes in this gym
      </p>
      <div
        class="flex gap-1 rounded-xl border border-outline/50 bg-surface p-1"
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
          <span>{{ selectedWalls.length === 1 ? selectedWalls[0] : selectedWalls.length ? `${selectedWalls.length} walls selected` : 'All walls' }}<template v-if="grade"> · {{ frenchGrade(Number(grade)) }}</template><template v-if="color"> · {{ color }}</template><template v-if="status"> · {{ statusLabels[status] }}<template v-if="status === 'untried'"> (no attempts)</template></template></span>
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
        <label class="grid gap-1.5 font-semibold">Grade
          <select
            v-model="grade"
            class="min-h-11 rounded-lg border border-outline bg-bg px-2 font-normal"
          >
            <option value="">All grades</option>
            <option
              v-for="value in grades"
              :key="value"
              :value="String(value)"
            >{{ frenchGrade(value) }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 font-semibold">Hold color
          <select
            v-model="color"
            class="min-h-11 rounded-lg border border-outline bg-bg px-2 font-normal"
          >
            <option value="">All colors</option>
            <option
              v-for="value in colors"
              :key="value"
              :value="value"
            >{{ value }}</option>
          </select>
        </label>
        <label class="col-span-2 grid gap-1.5 font-semibold">Route status
          <select
            v-model="status"
            class="min-h-11 rounded-lg border border-outline bg-bg px-2 font-normal"
          >
            <option value="">Any status</option>
            <option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
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
            <GymMap
              :key="`${state.gymId}:${gyms.find(g => g.id === state.gymId)?.floorplanPath ?? ''}`"
              :navigation="mapNavigation"
              :floorplan-path="gyms.find(g => g.id === state.gymId)?.floorplanPath"
              :routes="filtered"
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
        />
      </ul>
      <div
        v-if="!filtered.length"
        class="py-8 text-center text-muted"
      >
        <p role="status">
          {{ state.busy ? 'Fetching the latest from TopLogger…' : filterCount ? 'No matching routes. Try clearing your filters.' : 'No routes to show.' }}
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
        class="mt-6 text-xs text-muted"
        role="status"
      >
        {{ state.busy ? 'Syncing with TopLogger…' : synced ? `Last synced ${synced}` : 'Not synced yet' }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import RouteCard from '../components/RouteCard.vue'
import GymMap from '../components/GymMap.vue'
import TlTabs from '../components/TlTabs.vue'
import { useTopLogger } from '../useTopLogger'
import { defaultWallSelection, frenchGrade, isNewRoute } from '~/shell/toplogger/domain'

const { state, filters, gyms, activeRoutes, load, refresh, selectGym, resetFilters, mapNavigation } = useTopLogger()

const { showFilters, grade, color, status, walls: selectedWalls } = toRefs(filters)
const filtersButton = useTemplateRef<HTMLButtonElement>('filtersButton')
const viewButton = useTemplateRef<HTMLButtonElement>('viewButton')
const statusLabels: Record<string, string> = { untried: 'To try', attempted: 'Attempted', todo: 'Not done', topped: 'Done', new: 'New (last 14 days)' }

const sorted = computed(() => [...activeRoutes.value].sort((a, b) =>
  a.grade - b.grade
  || (a.wall?.nameLoc || '').localeCompare(b.wall?.nameLoc || '')
  || (a.label || '').localeCompare(b.label || '', undefined, { numeric: true })))

const filtered = computed(() => {
  return sorted.value.filter((route) => {
    const cu = route.climbUser
    const matchesStatus = !status.value
      || (status.value === 'new'
        ? isNewRoute(route.inAt)
        : status.value === 'topped'
          ? (cu?.tickType || 0) > 0
          : status.value === 'todo'
            ? !cu?.tickType
            : status.value === 'attempted'
              ? (cu?.totalTries || 0) > 0 && !cu?.tickType
              : !cu?.totalTries && !cu?.tickType)
    return (!grade.value || String(route.grade) === grade.value)
      && (!selectedWalls.value.length || selectedWalls.value.includes(route.wall?.nameLoc || ''))
      && (!color.value || route.holdColor?.nameLoc === color.value)
      && matchesStatus
  })
})

const grades = computed(() => [...new Set(activeRoutes.value.map(r => r.grade))].sort((a, b) => a - b))
const walls = computed(() => [...new Set(activeRoutes.value.flatMap(r => r.wall?.nameLoc ? [r.wall.nameLoc] : []))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
const colors = computed(() => [...new Set(activeRoutes.value.map(r => r.holdColor?.nameLoc).filter((c): c is string => !!c))].sort())
const filterCount = computed(() => [grade.value, selectedWalls.value.length, color.value, status.value].filter(Boolean).length)
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
  resetFilters()
  allWalls()
}

function allWalls() {
  filters.wallsChosen = true
  selectedWalls.value = []
}

onMounted(load)
</script>
