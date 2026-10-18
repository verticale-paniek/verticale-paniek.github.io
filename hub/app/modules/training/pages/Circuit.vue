<template>
  <section>
    <NuxtLink
      to="/training"
      class="mb-3 flex min-h-11 items-center gap-1.5 text-sm text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon
        name="lucide:arrow-left"
        aria-hidden="true"
      />
      Training
    </NuxtLink>

    <p
      v-if="!circuit"
      class="my-6 text-muted"
      role="status"
    >
      Circuit not found.
    </p>

    <template v-else>
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ circuit.title }}
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ summary }}
      </p>

      <ol class="m-0 mt-4 list-none p-0">
        <li
          v-for="(slot, index) in circuit.slots"
          :key="index"
          class="flex gap-3 border-b border-outline/50 py-3"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-text/5 text-sm font-semibold text-muted">{{ index + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm">{{ slot.text }}</span>
            <span class="block text-xs text-muted">{{ slot.label }} · {{ slot.timer ? getTimer(slot.timer)?.label : 'Untimed' }}</span>
          </span>
        </li>
      </ol>
    </template>
  </section>
</template>

<script setup lang="ts">
import { getCircuit, getTimer } from '../plan'

const route = useRoute()

const circuit = computed(() => getCircuit(String(route.query.id ?? '')))
const summary = computed(() => {
  const c = circuit.value
  if (!c) {
    return ''
  }
  return [`${c.slots.length} exercises`, c.rounds > 1 ? `${c.rounds} rounds` : '', c.note ?? ''].filter(Boolean).join(' · ')
})
</script>
