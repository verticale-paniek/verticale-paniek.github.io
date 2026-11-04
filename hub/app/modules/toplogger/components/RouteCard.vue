<template>
  <li class="mt-2">
    <NuxtLink
      :to="{ path: '/toplogger/route', query: { id: route.id } }"
      class="flex min-h-20 items-center gap-3 rounded-xl border border-outline/50 bg-surface p-3 text-text transition hover:border-accent/50 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent"
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
          <span v-if="isNew" class="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">New</span>
        </span>
        <span class="break-words text-sm text-muted">
          {{ route.wall?.nameLoc || 'Wall unknown' }} · {{ route.holdColor?.nameLoc || 'Color unknown' }}
        </span>
        <span class="text-xs text-muted">
          <span :class="{ 'text-emerald-700 dark:text-emerald-300': done }">{{ done ? ascentLabel(tickType) : attempted ? 'Attempted' : 'To do' }}</span><template v-if="route.climbUser?.totalTries"> · {{ route.climbUser.totalTries }} {{ route.climbUser.totalTries === 1 ? 'attempt' : 'attempts' }}</template>
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
        class="grid size-9 shrink-0 place-items-center rounded-full text-lg"
        :class="done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : attempted ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'text-muted'"
        :title="done ? ascentLabel(tickType) : attempted ? 'Attempted' : 'To do'"
      >
        <Icon
          v-if="done"
          :name="tickType === 3 ? 'lucide:check-check' : tickType === 2 ? 'lucide:zap' : 'lucide:check'"
          aria-hidden="true"
        />
        <Icon
          v-else
          name="lucide:circle"
          aria-hidden="true"
        />
      </span>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { ascentLabel, colorValue, daysLeft, daysLeftLabel, frenchGrade, isNewRoute, topCount, type RankedRoute, type Route } from '~/shell/toplogger/domain'

/** In the Top 10, `ranked` shows the ascent that earned the place instead of the route's current best. */
const props = defineProps<{ route: Route, rank?: number, ranked?: RankedRoute, days?: number }>()
const tickType = computed(() => props.ranked?.ascent.tickType ?? props.route.climbUser?.tickType ?? 0)
const done = computed(() => tickType.value > 0)
const attempted = computed(() => !done.value && !!props.route.climbUser?.totalTries)
const isNew = computed(() => isNewRoute(props.route.inAt))
const tops = computed(() => topCount(props.route.climbUser))
</script>
