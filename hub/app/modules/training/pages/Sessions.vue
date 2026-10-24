<template>
  <section>
    <div class="flex items-center gap-2">
      <h1 class="flex-1 text-2xl font-semibold tracking-tight">
        Sessions
      </h1>
      <NuxtLink
        to="/training/manage"
        class="flex min-h-11 items-center gap-1.5 rounded-xl border border-outline px-3 text-sm font-medium transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Icon
          name="lucide:pencil"
          aria-hidden="true"
        />
        Edit sessions
      </NuxtLink>
    </div>
    <p class="mt-1 text-sm text-muted">
      Pick a session to run. Sessions are gone when you reload the app.
    </p>

    <p
      v-if="!sessions.length"
      class="my-6 text-muted"
      role="status"
    >
      No sessions yet. Make one under Edit sessions.
    </p>

    <ul class="m-0 mt-4 list-none p-0">
      <li
        v-for="item in sessions"
        :key="item.key"
        class="mb-3 rounded-xl border border-outline/50 bg-surface"
      >
        <NuxtLink
          to="/training/run"
          class="flex min-h-14 items-center gap-3 p-3 focus-visible:outline-2 focus-visible:outline-accent"
          @click="openSession(item.key)"
        >
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ item.name }}</span>
            <span class="block truncate text-xs text-muted">{{ summary(item) }}</span>
          </span>
          <Icon
            name="lucide:chevron-right"
            class="text-muted"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useSession, type Session } from '../useSession'

const { sessions, openSession } = useSession()

const summary = (item: Session) => item.blocks.map(b => b.title).join(' · ') || 'Empty'
</script>
