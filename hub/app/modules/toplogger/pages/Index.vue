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
        to="/toplogger/account"
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
        aria-label="Route completion"
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

      <div class="mt-3 flex gap-2">
        <label class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline bg-bg px-3 focus-within:outline-2 focus-within:outline-accent">
          <Icon
            name="lucide:search"
            class="shrink-0 text-muted"
            aria-hidden="true"
          />
          <input
            ref="searchInput"
            v-model="search"
            class="w-full min-w-0 bg-transparent py-2 text-base outline-none"
            type="search"
            placeholder="Search routes…"
            aria-label="Search routes"
          >
        </label>
        <button
          ref="filtersButton"
          class="flex min-h-11 items-center gap-1.5 rounded-xl border border-outline px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent"
          :aria-expanded="showFilters"
          aria-controls="filters"
          @click="showFilters = !showFilters"
        >
          <Icon
            name="lucide:sliders-horizontal"
            aria-hidden="true"
          />
          Filters<template v-if="filterCount">
            · {{ filterCount }}
          </template>
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
        <label class="col-span-2 grid gap-1.5 font-semibold">Ascent status
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

      <div class="mb-3 mt-4 flex flex-wrap items-center justify-between gap-3">
        <p class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted" role="status">
          <strong class="text-sm font-semibold text-text">{{ filtered.length }} {{ filtered.length === 1 ? 'route' : 'routes' }} shown</strong>
          <span>{{ selectedWalls.length === 1 ? selectedWalls[0] : selectedWalls.length ? `${selectedWalls.length} walls selected` : 'All walls' }}<template v-if="grade"> · {{ frenchGrade(Number(grade)) }}</template><template v-if="color"> · {{ color }}</template><template v-if="status"> · {{ statusLabels[status] }}<template v-if="status === 'untried'"> (no attempts)</template></template></span>
        </p>
        <div class="flex shrink-0 gap-1 rounded-xl border border-outline/50 bg-surface p-1" role="group" aria-label="Route view">
          <button
            v-for="view in (['list', 'map'] as const)"
            :key="view"
            class="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-accent"
            :class="state.view === view ? 'bg-accent/15 text-accent' : 'text-muted'"
            :aria-pressed="state.view === view"
            @click="state.view = view"
          >
            <Icon :name="view === 'list' ? 'lucide:list' : 'lucide:map'" aria-hidden="true" />
            {{ view }}
          </button>
        </div>
      </div>
      <GymMap
        v-if="state.view === 'map'"
        :key="`${state.gymId}:${gyms.find(g => g.id === state.gymId)?.floorplanPath ?? ''}`"
        :navigation="mapNavigation"
        :floorplan-path="gyms.find(g => g.id === state.gymId)?.floorplanPath"
        :routes="filtered"
      />
      <ul v-else class="m-0 list-none p-0">
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
          {{ state.busy ? 'Fetching the latest from TopLogger…' : search || filterCount ? 'No matching routes. Try a broader search or clear your filters.' : 'No routes to show.' }}
        </p>
        <div v-if="!state.busy" class="mt-3 flex flex-wrap justify-center gap-2">
          <button
            v-if="search"
            class="min-h-11 rounded-xl border border-outline px-4 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent"
            @click="search = ''; searchInput?.focus()"
          >
            Clear search
          </button>
          <button
            v-if="filterCount"
            class="min-h-11 rounded-xl border border-outline px-4 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent"
            @click="resetAll(); searchInput?.focus()"
          >
            Reset search and filters
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
import { defaultWallSelection, frenchGrade } from '~/shell/toplogger/domain'

const { state, filters, gyms, activeRoutes, load, refresh, selectGym, resetFilters, mapNavigation } = useTopLogger()

const { search, showFilters, grade, color, status, walls: selectedWalls } = toRefs(filters)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const filtersButton = useTemplateRef<HTMLButtonElement>('filtersButton')
const statusLabels: Record<string, string> = { untried: 'To try', attempted: 'Attempted', todo: 'Not done', topped: 'Done' }

const sorted = computed(() => [...activeRoutes.value].sort((a, b) =>
  a.grade - b.grade
  || (a.wall?.nameLoc || '').localeCompare(b.wall?.nameLoc || '')
  || (a.label || '').localeCompare(b.label || '', undefined, { numeric: true })))

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return sorted.value.filter((route) => {
    const cu = route.climbUser
    const matchesStatus = !status.value
      || (status.value === 'topped'
        ? (cu?.tickType || 0) > 0
        : status.value === 'todo'
          ? !cu?.tickType
          : status.value === 'attempted'
            ? (cu?.totalTries || 0) > 0 && !cu?.tickType
            : !cu?.totalTries && !cu?.tickType)
    return (!query || [route.name, route.label, route.wall?.nameLoc, route.holdColor?.nameLoc, route.setterName, frenchGrade(route.grade)].some(v => v?.toLowerCase().includes(query)))
      && (!grade.value || String(route.grade) === grade.value)
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
  { id: 'topped', title: 'Done', count: topped.value },
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
