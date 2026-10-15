<template>
  <li class="mt-2">
    <NuxtLink
      :to="{ path: '/toplogger/route', query: { id: route.id } }"
      class="flex min-h-16 items-center gap-3 rounded-xl border bg-surface p-3 text-text transition hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-accent"
      :class="done ? 'border-emerald-500/60' : 'border-outline/50'"
    >
      <span
        class="size-3 shrink-0 rounded-full border border-outline"
        :style="{ background: colorValue(route.holdColor?.color) }"
        aria-hidden="true"
      />
      <strong class="w-10 shrink-0 text-lg tabular-nums">{{ frenchGrade(route.grade) }}</strong>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="break-words text-sm font-semibold">{{ route.name || (route.label ? `Rope ${route.label}` : route.wall?.nameLoc || 'Route') }}</span>
        <span class="break-words text-xs text-muted">
          {{ route.wall?.nameLoc || 'Wall unknown' }} · {{ route.holdColor?.nameLoc || 'Color unknown' }}<template v-if="route.climbUser?.totalTries"> · {{ route.climbUser.totalTries }} {{ route.climbUser.totalTries === 1 ? 'attempt' : 'attempts' }}</template>
        </span>
      </span>
      <span
        v-if="tops > 1"
        class="shrink-0 text-xs tabular-nums text-muted"
      ><span aria-hidden="true">×{{ tops }}</span><span class="sr-only">{{ tops }} ascents</span></span>
      <span
        class="grid size-9 shrink-0 place-items-center rounded-lg border text-lg"
        :class="done ? 'border-emerald-500 bg-emerald-600 text-white' : attempted ? 'border-outline/50 text-amber-500' : 'border-outline/50 text-muted'"
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
        <span class="sr-only">{{ done ? ascentLabel(tickType) : attempted ? 'Attempted' : 'To do' }}</span>
      </span>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { ascentLabel, colorValue, frenchGrade, topCount, type Route } from '../utils/domain'

const props = defineProps<{ route: Route }>()
const tickType = computed(() => props.route.climbUser?.tickType ?? 0)
const done = computed(() => tickType.value > 0)
const attempted = computed(() => !done.value && !!props.route.climbUser?.totalTries)
const tops = computed(() => topCount(props.route.climbUser))
</script>
