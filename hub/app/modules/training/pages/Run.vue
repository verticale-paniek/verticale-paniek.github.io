<template>
  <section>
    <div class="flex items-center gap-2">
      <h1 class="flex-1 text-2xl font-semibold tracking-tight">
        Circuit
      </h1>
      <NuxtLink
        to="/training/edit"
        class="flex min-h-11 items-center gap-1.5 rounded-xl border border-outline px-3 text-sm font-medium transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Icon
          name="lucide:pencil"
          aria-hidden="true"
        />
        Edit
      </NuxtLink>
    </div>
    <p class="mt-1 text-sm text-muted">
      {{ circuit.slots.length }} exercises · {{ circuit.rounds }} {{ circuit.rounds === 1 ? 'round' : 'rounds' }}. Tap an exercise to open its timer.
    </p>

    <div class="mt-3 flex gap-4 text-sm">
      <label class="flex min-h-11 items-center gap-2">
        <input
          v-model="feedback.sound"
          type="checkbox"
          class="size-5"
        >
        Sound
      </label>
      <label class="flex min-h-11 items-center gap-2">
        <input
          v-model="feedback.vibration"
          type="checkbox"
          class="size-5"
        >
        Vibration
      </label>
    </div>

    <p
      v-if="!circuit.slots.length"
      class="my-6 text-muted"
      role="status"
    >
      The circuit is empty. Edit it to add an exercise.
    </p>

    <ol class="m-0 mt-4 list-none p-0">
      <li
        v-for="(slot, index) in circuit.slots"
        :key="slot.key"
        class="mb-3 rounded-xl border bg-surface"
        :class="open === slot.key ? 'border-accent' : 'border-outline/50'"
      >
        <button
          class="flex min-h-14 w-full items-center gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-accent"
          :aria-expanded="open === slot.key"
          @click="open = open === slot.key ? null : slot.key"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-text/5 text-sm font-semibold text-muted">{{ index + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ slot.option }}</span>
            <span class="block text-xs text-muted">{{ familyTitle(slot.family) }} · {{ timerLabel(slot) }}</span>
          </span>
          <Icon
            :name="open === slot.key ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            class="text-muted"
            aria-hidden="true"
          />
        </button>
        <div
          v-if="open === slot.key"
          class="px-3 pb-3"
        >
          <TimerPanel
            v-if="timerOf(slot)"
            :key="slot.key"
            :timer="timerOf(slot)!"
          />
          <p
            v-else
            class="rounded-xl border border-outline/50 bg-bg p-4 text-center text-sm text-muted"
          >
            Untimed. Do it at your own pace.
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import TimerPanel from '../components/TimerPanel.vue'
import { families, getProfile, getTimer, type Slot } from '../plan'
import { useCircuit } from '../useCircuit'
import { feedback } from '../utils/feedback'

const { circuit } = useCircuit()

/** The slot whose timer is open; one at a time, so only one timer runs. */
const open = ref<number | null>(null)

const familyTitle = (id: string) => families.find(f => f.id === id)?.title ?? id
const timerOf = (slot: Slot) => {
  const id = getProfile(slot.profileId)?.timer
  return id ? getTimer(id) : undefined
}
const timerLabel = (slot: Slot) => timerOf(slot)?.label ?? 'Untimed'
</script>
