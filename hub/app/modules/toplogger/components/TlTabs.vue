<template>
  <nav
    class="mb-6 flex gap-1 rounded-xl border border-outline/50 bg-surface p-1"
    aria-label="TopLogger sections"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
      active-class="bg-accent/15 !text-accent"
      exact-active-class="bg-accent/15 !text-accent"
    >
      <Icon
        :name="tab.icon"
        aria-hidden="true"
      />
      {{ tab.title }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const tabs = [
  { to: '/toplogger', title: 'Routes', icon: 'lucide:layout-grid' },
  { to: '/toplogger/account', title: 'Account', icon: 'lucide:user-round' },
]
</script>
