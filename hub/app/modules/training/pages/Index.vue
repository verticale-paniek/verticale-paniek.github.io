<template>
  <section>
    <h1 class="text-2xl font-semibold tracking-tight">
      Training
    </h1>
    <p class="mt-1 text-sm text-muted">
      Strength circuits.
    </p>

    <ul class="m-0 mt-4 list-none p-0">
      <li
        v-for="circuit in circuits"
        :key="circuit.id"
      >
        <NuxtLink
          :to="`/training/circuit?id=${circuit.id}`"
          class="flex min-h-14 items-center gap-3 border-b border-outline/50 py-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span class="min-w-0 flex-1">
            <span class="block font-medium">{{ circuit.title }}</span>
            <span class="block text-xs text-muted">{{ circuit.slots.length }} exercises · {{ circuit.rounds }} {{ circuit.rounds === 1 ? 'round' : 'rounds' }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { circuits } from '../plan'
</script>
