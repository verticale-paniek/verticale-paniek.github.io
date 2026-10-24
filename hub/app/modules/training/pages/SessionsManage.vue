<template>
  <section>
    <h1 class="text-2xl font-semibold tracking-tight">
      Edit sessions
    </h1>
    <p class="mt-1 text-sm text-muted">
      Make, change, copy or delete sessions. Nothing is saved: they are gone when you reload the app.
    </p>

    <p
      v-if="!sessions.length"
      class="my-6 text-muted"
      role="status"
    >
      No sessions yet. Make one.
    </p>

    <ul class="m-0 mt-4 list-none p-0">
      <li
        v-for="item in sessions"
        :key="item.key"
        class="mb-3 flex items-center rounded-xl border border-outline/50 bg-surface"
      >
        <NuxtLink
          to="/training/edit"
          class="min-w-0 flex-1 p-3 focus-visible:outline-2 focus-visible:outline-accent"
          @click="openSession(item.key)"
        >
          <span class="block text-sm font-medium">{{ item.name }}</span>
          <span class="block truncate text-xs text-muted">{{ summary(item) }}</span>
        </NuxtLink>
        <NuxtLink
          to="/training/edit"
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="`Edit ${item.name}`"
          @click="openSession(item.key)"
        >
          <Icon
            name="lucide:pencil"
            aria-hidden="true"
          />
        </NuxtLink>
        <button
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="`Copy ${item.name}`"
          @click="copySession(item.key)"
        >
          <Icon
            name="lucide:copy"
            aria-hidden="true"
          />
        </button>
        <button
          class="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="`Delete ${item.name}`"
          @click="deleteSession(item.key)"
        >
          <Icon
            name="lucide:trash"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>

    <button
      class="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      @click="onNew"
    >
      <Icon
        name="lucide:plus"
        aria-hidden="true"
      />
      New session
    </button>
  </section>
</template>

<script setup lang="ts">
import { useSession, type Session } from '../useSession'

const { sessions, openSession, newSession, copySession, deleteSession } = useSession()

const summary = (item: Session) => item.blocks.map(b => b.title).join(' · ') || 'Empty'

async function onNew() {
  newSession()
  await navigateTo('/training/edit')
}
useHeaderBack('Back to sessions', '/training')
</script>
