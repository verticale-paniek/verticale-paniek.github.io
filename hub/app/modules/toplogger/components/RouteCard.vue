<template>
  <li class="mt-2">
    <NuxtLink
      :to="{ path: '/toplogger/route', query: { id: route.id } }"
      class="flex min-h-18 items-center gap-3 rounded-xl border border-l-4 p-3 text-text transition hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent"
      :class="done ? 'border-emerald-600/50 border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-l-emerald-400' : 'border-outline bg-surface'"
    >
      <span
        v-if="rank"
        class="w-5 shrink-0 text-xs tabular-nums text-muted"
      >{{ String(rank).padStart(2, '0') }}</span>
      <span class="flex w-12 shrink-0 flex-col items-center gap-1.5 rounded-lg bg-bg py-2">
        <strong class="text-lg leading-none tabular-nums">{{ frenchGrade(route.grade) }}</strong>
        <span class="h-1.5 w-6 rounded-full border border-outline/50" :style="{ background: colorValue(route.holdColor?.color) }" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
          <span class="break-words">{{ route.name || (route.label ? `Rope ${route.label}` : route.wall?.nameLoc || 'Route') }}</span>
          <span v-if="isNew" class="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">New</span>
        </span>
        <span class="sr-only">
          {{ route.wall?.nameLoc || 'Wall unknown' }} · {{ route.holdColor?.nameLoc || 'Color unknown' }}
        </span>
        <span class="text-xs text-muted">
          {{ route.climbUser?.totalTries || 0 }} {{ route.climbUser?.totalTries === 1 ? 'attempt' : 'attempts' }}
        </span>
        <span
          v-if="ranked"
          class="text-xs text-muted"
        >{{ days ? `${daysLeftLabel(daysLeft(ranked.ascent.climbedAtDate, days))} · ` : '' }}{{ ranked.score }} points</span>
      </span>
      <span
        v-if="tops > 1 && !ranked"
        class="shrink-0 text-xs tabular-nums text-muted"
      ><span aria-hidden="true">×{{ tops }}</span><span class="sr-only">{{ tops }} ascents</span></span>
      <span
        class="flex min-h-9 w-28 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2"
        :class="done ? ascentClasses[tickType] : attempted ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-muted'"
        :title="done ? ascentLabel(tickType) : attempted ? 'Attempted' : 'To do'"
      >
        <Icon
          :name="done ? tickType === 3 ? 'lucide:check-check' : tickType === 2 ? 'lucide:zap' : 'lucide:check' : attempted ? 'lucide:rotate-cw' : 'lucide:circle'"
          class="shrink-0 text-lg"
          aria-hidden="true"
        />
        <span class="text-xs font-semibold leading-none">{{ done ? ascentLabel(tickType) : attempted ? 'Attempted' : 'To do' }}</span>
      </span>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { ascentLabel, colorValue, daysLeft, daysLeftLabel, frenchGrade, isNewRoute, topCount, type RankedRoute, type Route } from '~/shell/toplogger/domain'

/** In the Top 10, `ranked` shows the ascent that earned the place instead of the route's current best. */
const props = defineProps<{ route: Route, rank?: number, ranked?: RankedRoute, days?: number }>()
const ascentClasses: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  2: 'bg-emerald-500 text-emerald-950',
  3: 'bg-emerald-800 text-white dark:bg-emerald-300 dark:text-emerald-950',
}
const tickType = computed(() => props.ranked?.ascent.tickType ?? props.route.climbUser?.tickType ?? 0)
const done = computed(() => tickType.value > 0)
const attempted = computed(() => !done.value && !!props.route.climbUser?.totalTries)
const isNew = computed(() => isNewRoute(props.route.inAt))
const tops = computed(() => topCount(props.route.climbUser))
</script>
