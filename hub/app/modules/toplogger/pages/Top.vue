<template>
  <section class="pb-20">
    <TlTabs />

    <div class="flex items-center gap-2">
      <h1 class="flex-1 text-2xl font-semibold tracking-tight">
        Top 10
      </h1>
      <select
        v-if="gyms.length > 1"
        class="min-h-11 min-w-0 max-w-[55%] rounded-xl border border-outline bg-bg px-3 text-sm"
        aria-label="Selected gym"
        :value="state.gymId"
        @change="onGym(($event.target as HTMLSelectElement).value)"
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
        aria-label="Refresh Top 10"
        :disabled="busy || state.needsConnect"
        @click="refreshTop"
      >
        <Icon
          name="lucide:refresh-cw"
          :class="{ 'animate-spin': busy }"
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
      </NuxtLink> to see your Top 10.
    </p>
    <p
      v-if="state.error || top.error"
      class="my-4 text-error"
      role="alert"
    >
      {{ top.error || state.error }} <button
        class="underline"
        :disabled="busy"
        @click="refreshTop"
      >
        Retry
      </button>
    </p>

    <template v-if="!state.needsConnect">
      <div
        class="mt-4 flex gap-1 rounded-xl border border-outline/50 bg-bg p-1"
        role="group"
        aria-label="Period"
      >
        <button
          v-for="days in [60, 120, 180]"
          :key="days"
          class="min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-accent"
          :class="top.days === days ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'"
          :aria-pressed="top.days === days"
          @click="setDays(days)"
        >
          {{ days / 30 }} months
        </button>
      </div>

      <div class="mt-3 rounded-xl border border-outline/50 bg-surface p-4">
        <span class="text-xs text-muted">Average</span>
        <strong class="block text-2xl font-semibold text-amber-500">{{ rankable ? averageLabel(ranked) : '—' }}</strong>
        <span class="text-xs text-muted">{{ summary }}</span>
      </div>

      <div class="mb-1 mt-4 flex items-center justify-between">
        <h2 class="text-base font-semibold">
          Best ascents
        </h2>
        <span class="text-xs text-muted">{{ ranked.length }} / 10</span>
      </div>
      <ul class="m-0 list-none p-0">
        <RouteCard
          v-for="(item, index) in ranked"
          :key="item.route.id"
          :route="item.route"
          :rank="index + 1"
          :ranked="item"
          :days="top.days"
        />
      </ul>
      <p
        v-if="!ranked.length"
        class="py-8 text-center text-muted"
        role="status"
      >
        {{ empty }}
      </p>

      <details class="mt-4 text-sm text-muted">
        <summary class="min-h-11 cursor-pointer py-3">
          Scoring
        </summary>
        <p>Redpoint: route grade. Flash: grade + 10. Onsight: grade + 15. Your best qualifying ascent per route counts, including removed routes. Ties favor the most recent ascent. The average uses the routes available, up to ten.</p>
      </details>

      <p
        class="mt-4 text-xs text-muted"
        role="status"
      >
        {{ busy ? 'Syncing with TopLogger…' : synced ? `Last synced ${synced}` : 'Not synced yet' }}<span v-if="top.error && rankable"> · Saved history</span>
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import RouteCard from '../components/RouteCard.vue'
import TlTabs from '../components/TlTabs.vue'
import { useTopLogger } from '../useTopLogger'
import { averageLabel } from '../utils/domain'

const { state, top, gyms, ranked, rankable, enterTop, refreshTop, setDays, selectGym } = useTopLogger()

const busy = computed(() => state.busy || top.busy)
const synced = computed(() => top.at
  ? new Date(top.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '')

const summary = computed(() => rankable.value
  ? `${ranked.value.length} ${ranked.value.length === 1 ? 'route' : 'routes'} · past ${top.days} days`
  : top.busy ? 'Loading ascent history…' : 'Ascent history unavailable')

const empty = computed(() => top.busy
  ? 'Loading history, including routes that have left the wall.'
  : rankable.value
    ? 'No qualifying ascents in this period. Try a longer window.'
    : 'Connect and refresh to load your ascent history.')

// Switching gym here also loads that gym's history.
async function onGym(gymId: string) {
  await selectGym(gymId)
  await enterTop()
}

onMounted(enterTop)
</script>
