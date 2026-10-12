<template>
  <section>
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
      Your climbing hub
    </h1>
    <p class="mb-8 mt-2 text-muted">
      Everything for Verticale Paniek, in one place.
    </p>
    <ul class="grid list-none gap-4 p-0 sm:grid-cols-2">
      <li
        v-for="m in modules"
        :key="m.id"
      >
        <NuxtLink
          class="group flex h-full items-center gap-4 rounded-2xl border border-outline/50 bg-surface p-5 text-text transition hover:border-accent/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          :to="`/${m.id}`"
        >
          <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-bg text-2xl" aria-hidden="true">{{ m.icon }}</span>
          <span class="min-w-0 flex-1">
            <strong class="font-semibold">{{ m.name }}</strong>
            <small
              v-if="m.description"
              class="mt-1 block text-sm leading-relaxed text-muted"
            >{{ m.description }}</small>
          </span>
          <Icon name="lucide:chevron-right" class="shrink-0 text-muted transition group-hover:text-accent" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { modules } from '~/shell/modules'
</script>
