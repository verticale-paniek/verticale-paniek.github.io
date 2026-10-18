<template>
  <section>
    <h1 class="text-2xl font-semibold tracking-tight">
      Circuit
    </h1>
    <p class="mt-1 text-sm text-muted">
      Build the strength circuit: pick a timer type and an exercise for each slot, then start. Nothing is saved.
    </p>

    <div class="mt-4 flex items-center gap-3 rounded-xl border border-outline/50 bg-surface p-3">
      <span class="flex-1 text-sm font-medium">Rounds</span>
      <button
        class="grid size-11 place-items-center rounded-xl text-lg text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        aria-label="Fewer rounds"
        :disabled="circuit.rounds <= 1"
        @click="setRounds(circuit.rounds - 1)"
      >
        −
      </button>
      <strong
        class="w-6 text-center text-lg"
        aria-live="polite"
      >{{ circuit.rounds }}</strong>
      <button
        class="grid size-11 place-items-center rounded-xl text-lg text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        aria-label="More rounds"
        :disabled="circuit.rounds >= 5"
        @click="setRounds(circuit.rounds + 1)"
      >
        +
      </button>
    </div>

    <ol class="m-0 mt-4 list-none p-0">
      <li
        v-for="(slot, index) in circuit.slots"
        :key="slot.key"
        class="mb-3 rounded-xl border border-outline/50 bg-surface p-3"
      >
        <div class="flex items-center gap-2">
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-text/5 text-sm font-semibold text-muted">{{ index + 1 }}</span>
          <strong class="flex-1">{{ familyTitle(slot.family) }}</strong>
          <button
            class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            :aria-label="`Remove slot ${index + 1}`"
            @click="remove(slot.key)"
          >
            <Icon
              name="lucide:x"
              aria-hidden="true"
            />
          </button>
        </div>
        <label class="mt-2 block text-xs text-muted">Timer
          <select
            class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
            :value="slot.profileId"
            @change="setProfile(slot, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="profile in profilesFor(slot.family)"
              :key="profile.id"
              :value="profile.id"
            >{{ profile.title }}</option>
          </select>
        </label>
        <label class="mt-2 block text-xs text-muted">Exercise
          <select
            v-model="slot.option"
            class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
          >
            <option
              v-for="option in getProfile(slot.profileId)?.options"
              :key="option"
              :value="option"
            >{{ option }}</option>
          </select>
        </label>
      </li>
    </ol>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="family in families"
        :key="family.id"
        class="min-h-11 rounded-xl border border-outline px-3 text-sm font-medium transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent"
        @click="add(family.id)"
      >
        + {{ family.title }}
      </button>
      <span class="flex-1" />
      <button
        class="min-h-11 px-2 text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-accent"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <NuxtLink
      to="/training/run"
      class="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      :class="{ 'pointer-events-none opacity-50': !circuit.slots.length }"
      :aria-disabled="!circuit.slots.length"
    >
      Start
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { families, getProfile, profilesFor } from '../plan'
import { useCircuit } from '../useCircuit'

const { circuit, add, remove, setProfile, setRounds, reset } = useCircuit()

const familyTitle = (id: string) => families.find(f => f.id === id)?.title ?? id
</script>
