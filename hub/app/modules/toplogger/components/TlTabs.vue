<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-10 border-t border-outline/50 bg-surface pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    aria-label="TopLogger sections"
  >
    <div class="mx-auto flex max-w-4xl gap-1 px-2 py-1">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-accent"
        :class="isCurrent(tab) ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'"
        :aria-current="isCurrent(tab) ? 'page' : undefined"
      >
        <Icon
          :name="tab.icon"
          class="text-xl"
          aria-hidden="true"
        />
        {{ tab.title }}
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()

// A route's own screen counts as part of the Routes tab.
const tabs = [
  { to: '/toplogger', title: 'Routes', icon: 'lucide:layout-grid', paths: ['/toplogger', '/toplogger/route'] },
  { to: '/toplogger/top', title: 'Top 10', icon: 'lucide:trophy', paths: ['/toplogger/top'] },
  { to: '/toplogger/account', title: 'Account', icon: 'lucide:user-round', paths: ['/toplogger/account'] },
]

const isCurrent = (tab: typeof tabs[number]) => tab.paths.includes(route.path.replace(/\/$/, ''))
</script>
