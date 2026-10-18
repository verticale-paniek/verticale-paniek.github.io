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
      {{ summary }} Tap an exercise to open its timer.
    </p>

    <label class="mt-3 block text-xs text-muted">Circuit
      <select
        class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
        :value="circuit.presetId"
        @change="onPreset(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="preset in presets"
          :key="preset.id"
          :value="preset.id"
        >{{ preset.title }}</option>
      </select>
    </label>

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
        :id="`slot-${slot.key}`"
        :key="slot.key"
        class="mb-3 rounded-xl border bg-surface"
        :class="open === slot.key ? 'border-accent' : 'border-outline/50'"
      >
        <button
          class="flex min-h-14 w-full items-center gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-accent"
          :aria-expanded="open === slot.key"
          @click="toggle(slot.key)"
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
            :chain="chainOf(slot, index)"
            @finished="onFinished(index)"
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
import TimerPanel, { type Chain } from '../components/TimerPanel.vue'
import { families, getProfile, getTimer, type Slot } from '../plan'
import { useCircuit } from '../useCircuit'

const { circuit, presets, load } = useCircuit()

/** The slot whose timer is open; one at a time, so only one timer runs. */
const open = ref<number | null>(null)
/** The slot a chain opened by itself; its timer starts without a tap. */
const autoKey = ref<number | null>(null)

const summary = computed(() => {
  const rounds = `${circuit.rounds} ${circuit.rounds === 1 ? 'round' : 'rounds'}`
  return `${circuit.slots.length} exercises · ${rounds}${circuit.chain ? ' · each one starts by itself after the previous.' : '.'}`
})

const familyTitle = (id: string) => families.find(f => f.id === id)?.title ?? id
const timerOf = (slot: Slot) => {
  const id = getProfile(slot.profileId)?.timer
  return id ? getTimer(id) : undefined
}
const timerLabel = (slot: Slot) => timerOf(slot)?.label ?? 'Untimed'

function chainOf(slot: Slot, index: number): Chain | undefined {
  if (!circuit.chain) {
    return undefined
  }
  return {
    title: slot.option,
    position: `${index + 1} of ${circuit.slots.length}`,
    next: circuit.slots[index + 1]?.option ?? null,
    last: index === circuit.slots.length - 1,
    auto: autoKey.value === slot.key,
  }
}

function toggle(key: number) {
  autoKey.value = null
  open.value = open.value === key ? null : key
}

/** In a chain, the next exercise opens and starts when one ends. */
function onFinished(index: number) {
  const next = circuit.slots[index + 1]
  if (!circuit.chain || !next) {
    return
  }
  open.value = next.key
  autoKey.value = timerOf(next) ? next.key : null
  nextTick(() => document.getElementById(`slot-${next.key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}

function onPreset(id: string) {
  open.value = null
  autoKey.value = null
  load(id)
}
</script>
