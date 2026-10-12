<template>
  <div class="flex min-h-dvh flex-col">
    <header class="flex items-center gap-3 bg-surface px-4 py-3">
      <NuxtLink
        v-if="!isHome && user"
        to="/"
        class="text-xl no-underline"
        aria-label="Back to launcher"
      ><Icon
        name="lucide:arrow-left"
        aria-hidden="true"
      /></NuxtLink>
      <img
        src="/favicon.png"
        alt=""
        width="28"
        height="28"
      >
      <strong>Verticale Paniek</strong>
      <span class="flex-1" />
      <ThemeToggle />
      <NuxtLink
        v-if="user"
        to="/account"
        class="grid size-8 place-items-center rounded-full bg-accent font-bold text-bg no-underline"
        aria-label="Account"
      ><AvatarRoot><AvatarFallback>{{ initial }}</AvatarFallback></AvatarRoot></NuxtLink>
    </header>
    <main class="flex-1 p-4">
      <slot />
    </main>
    <footer class="px-4 py-3 text-center text-[0.8rem] text-muted">
      <BuildVersion />
    </footer>
    <UpdatePrompt />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const isHome = computed(() => route.path === '/')
const initial = computed(() => (user.value?.email?.[0] ?? '?').toUpperCase())
</script>
