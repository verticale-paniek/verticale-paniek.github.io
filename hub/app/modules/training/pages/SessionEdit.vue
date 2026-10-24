<template>
  <section v-if="session">
    <NuxtLink
      to="/training/manage"
      class="mb-3 flex min-h-11 items-center gap-1.5 text-sm text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon
        name="lucide:arrow-left"
        aria-hidden="true"
      />
      Back to edit sessions
    </NuxtLink>

    <h1 class="text-2xl font-semibold tracking-tight">
      Edit session
    </h1>
    <p class="mt-1 text-sm text-muted">
      Name it, add the blocks in order and edit each one. Changes stay until you reload the app; nothing is saved.
    </p>

    <label class="mt-4 block text-xs text-muted">Name
      <input
        v-model="session.name"
        type="text"
        maxlength="40"
        class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
      >
    </label>

    <ol class="m-0 mt-4 list-none p-0">
      <li
        v-for="(item, index) in session.blocks"
        :key="item.key"
        class="mb-3 flex items-center rounded-xl border border-outline/50 bg-surface"
      >
        <NuxtLink
          to="/training/block-edit"
          class="min-w-0 flex-1 p-3 focus-visible:outline-2 focus-visible:outline-accent"
          @click="openBlock(item.key)"
        >
          <span class="block text-sm font-medium">{{ item.title }}</span>
          <span class="block truncate text-xs text-muted">{{ describeBlock(item) }}</span>
        </NuxtLink>
        <button
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"
          :aria-label="`Move ${item.title} up`"
          :disabled="index === 0"
          @click="moveBlock(item.key, -1)"
        >
          <Icon
            name="lucide:arrow-up"
            aria-hidden="true"
          />
        </button>
        <button
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"
          :aria-label="`Move ${item.title} down`"
          :disabled="index === session.blocks.length - 1"
          @click="moveBlock(item.key, 1)"
        >
          <Icon
            name="lucide:arrow-down"
            aria-hidden="true"
          />
        </button>
        <button
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="`Remove ${item.title}`"
          @click="removeBlock(item.key)"
        >
          <Icon
            name="lucide:x"
            aria-hidden="true"
          />
        </button>
      </li>
    </ol>

    <p
      v-if="!session.blocks.length"
      class="my-4 text-muted"
      role="status"
    >
      No blocks yet. Add one below.
    </p>

    <label class="mt-4 block text-xs text-muted">Add a block
      <select
        class="mt-1 block min-h-11 w-full rounded-xl border border-outline bg-bg px-3 text-sm text-text"
        value=""
        @change="onAdd($event.target as HTMLSelectElement)"
      >
        <option value="">Choose a block...</option>
        <option
          v-for="preset in presets"
          :key="preset.id"
          :value="preset.id"
        >{{ preset.title }}</option>
      </select>
    </label>

    <NuxtLink
      to="/training/manage"
      class="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Done
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { describeBlock, useSession } from '../useSession'

const { session, presets, openBlock, addBlock, removeBlock, moveBlock } = useSession()

function onAdd(select: HTMLSelectElement) {
  if (select.value) {
    addBlock(select.value)
    select.value = ''
  }
}
</script>
