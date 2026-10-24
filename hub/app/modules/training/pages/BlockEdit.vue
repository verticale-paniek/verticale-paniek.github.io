<template>
  <section v-if="block">
    <NuxtLink
      to="/training/edit"
      class="mb-3 flex min-h-11 items-center gap-1.5 text-sm text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon
        name="lucide:arrow-left"
        aria-hidden="true"
      />
      Back to session
    </NuxtLink>

    <h1 class="text-2xl font-semibold tracking-tight">
      Edit block
    </h1>

    <label class="mt-4 block text-xs text-muted">Title
      <input
        v-model="block.title"
        type="text"
        maxlength="40"
        class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
      >
    </label>

    <template v-if="block.kind === 'pick'">
      <p class="mt-4 text-sm text-muted">
        Pick what you will do, and add a note if you need to.
      </p>

      <ul
        v-if="block.choices.length"
        class="m-0 mt-3 list-none p-0"
      >
        <li
          v-for="choice in block.choices"
          :key="choice"
          class="mb-2 flex items-center rounded-xl border border-outline/50 bg-surface pl-3 text-sm"
        >
          <span class="flex-1 py-2">{{ choice }}</span>
          <button
            class="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            :aria-label="`Remove ${choice}`"
            @click="removeChoice(choice)"
          >
            <Icon
              name="lucide:x"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>

      <label
        v-if="available.length"
        class="mt-3 block text-xs text-muted"
      >Add an option
        <select
          class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
          value=""
          @change="onAdd($event.target as HTMLSelectElement)"
        >
          <option value="">Choose...</option>
          <option
            v-for="option in available"
            :key="option"
            :value="option"
          >{{ option }}</option>
        </select>
      </label>

      <label class="mt-3 block text-xs text-muted">Note
        <textarea
          v-model="block.note"
          rows="4"
          class="mt-1 block w-full rounded-xl border border-outline bg-bg p-3 text-sm text-text"
          placeholder="Anything else for this block"
        />
      </label>
    </template>

    <template v-else>
      <p class="mt-4 text-sm text-muted">
        Pick a timer type and an exercise for each slot.
      </p>

      <div class="mt-3 flex items-center gap-3 rounded-xl border border-outline/50 bg-surface p-3">
        <span class="flex-1 text-sm font-medium">Rounds</span>
        <button
          class="grid size-11 place-items-center rounded-xl text-lg text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
          aria-label="Fewer rounds"
          :disabled="block.rounds <= 1"
          @click="setRounds(block.rounds - 1)"
        >
          −
        </button>
        <strong
          class="w-6 text-center text-lg"
          aria-live="polite"
        >{{ block.rounds }}</strong>
        <button
          class="grid size-11 place-items-center rounded-xl text-lg text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
          aria-label="More rounds"
          :disabled="block.rounds >= 5"
          @click="setRounds(block.rounds + 1)"
        >
          +
        </button>
      </div>

      <label class="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-outline/50 bg-surface p-3 text-sm">
        <input
          v-model="block.chain"
          type="checkbox"
          class="size-5"
        >
        <span class="flex-1 font-medium">Auto-continue</span>
        <span class="text-xs text-muted">Each exercise starts after the previous one</span>
      </label>

      <ol class="m-0 mt-4 list-none p-0">
        <li
          v-for="(slot, index) in block.slots"
          :key="slot.key"
          class="mb-3 rounded-xl border border-outline/50 bg-surface p-3"
        >
          <div class="flex items-center gap-2">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-text/5 text-sm font-semibold text-muted">{{ index + 1 }}</span>
            <strong class="flex-1">{{ familyTitle(slot.family) }}</strong>
            <button
              class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              :aria-label="`Remove slot ${index + 1}`"
              @click="removeSlot(slot.key)"
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
          @click="addSlot(family.id)"
        >
          + {{ family.title }}
        </button>
      </div>
    </template>

    <div class="mt-4 flex">
      <button
        class="min-h-11 px-2 text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-accent"
        @click="resetBlock"
      >
        Reset block
      </button>
    </div>

    <NuxtLink
      to="/training/edit"
      class="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Done
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { families, getProfile, profilesFor } from '../plan'
import { useSession } from '../useSession'

const { block, addSlot, removeSlot, setProfile, setRounds, addChoice, removeChoice, resetBlock } = useSession()

const familyTitle = (id: string) => families.find(f => f.id === id)?.title ?? id

const available = computed(() => block.value?.pool.filter(o => !block.value!.choices.includes(o)) ?? [])

function onAdd(select: HTMLSelectElement) {
  addChoice(select.value)
  select.value = ''
}
</script>
