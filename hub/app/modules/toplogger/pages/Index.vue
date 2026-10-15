<template>
  <section>
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
      <div
        class="mt-4 flex gap-1 rounded-xl border border-outline/50 bg-bg p-1"
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
        <label class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline bg-bg px-3">
          <Icon
            name="lucide:search"
            class="shrink-0 text-muted"
            aria-hidden="true"
          />
          <input
            v-model="search"
            class="w-full min-w-0 bg-transparent py-2 text-base outline-none"
            type="search"
            placeholder="Search"
            aria-label="Search routes"
          >
        </label>
        <button
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
            <option value="untried">To try</option>
            <option value="attempted">Attempted</option>
            <option value="todo">Not done</option>
            <option value="topped">Done</option>
          </select>
        </label>
        <fieldset class="col-span-2 m-0 min-w-0 border-0 p-0">
          <legend class="font-semibold">
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
                @change="wallsChanged = true"
              >
              {{ value }}
            </label>
          </div>
        </fieldset>
        <button
          class="col-span-2 min-h-11 text-left text-accent"
          @click="resetFilters"
        >
          Reset filters
        </button>
      </div>

      <p class="mt-3 border-b border-outline/50 pb-2 text-xs text-muted">
        <span v-if="selectedWalls.length">{{ selectedWalls[0] }}<template v-if="selectedWalls.length > 1"> +{{ selectedWalls.length - 1 }}</template> · </span>{{ filtered.length }} {{ filtered.length === 1 ? 'route' : 'routes' }}
      </p>
      <ul class="m-0 list-none p-0">
        <RouteCard
          v-for="route in filtered"
          :key="route.id"
          :route="route"
        />
      </ul>
      <p
        v-if="!filtered.length"
        class="py-8 text-center text-muted"
        role="status"
      >
        {{ state.busy ? 'Fetching the latest from TopLogger…' : search || filterCount ? 'No matching routes. Try a broader search or clear your filters.' : 'No routes to show.' }}
      </p>

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
import { useTopLogger } from '../useTopLogger'
import { defaultWallSelection, frenchGrade } from '../utils/domain'

const { state, gyms, activeRoutes, load, refresh, selectGym } = useTopLogger()

const search = ref('')
const showFilters = ref(false)
const grade = ref('')
const color = ref('')
const status = ref('')
const selectedWalls = ref<string[]>([])
const wallsChanged = ref(false)

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

// Changing gym restores that gym's default wall selection (Klimax: sectors 1 to 7).
watch(() => state.gymId, () => {
  grade.value = color.value = status.value = search.value = ''
  selectedWalls.value = []
  wallsChanged.value = false
})
watch([() => state.gymId, walls], () => {
  if (!wallsChanged.value) {
    selectedWalls.value = defaultWallSelection(gyms.value.find(g => g.id === state.gymId)?.name || '', walls.value)
  }
})

function allWalls() {
  wallsChanged.value = true
  selectedWalls.value = []
}

function resetFilters() {
  grade.value = color.value = status.value = search.value = ''
  allWalls()
}

onMounted(load)
</script>
