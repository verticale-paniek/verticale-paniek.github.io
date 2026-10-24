<template>
  <div class="flex min-h-dvh flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] antialiased">
    <header class="border-b border-outline/50 bg-surface pt-[env(safe-area-inset-top)]">
      <div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-8">
        <button
          v-if="headerBack && user"
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-xl text-accent transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent"
          :aria-label="headerBack.label"
          :title="headerBack.label"
          @click="goBack(headerBack)"
        >
          <Icon
            name="lucide:arrow-left"
            aria-hidden="true"
          />
        </button>
        <NuxtLink
          v-else-if="!isHome && user"
          to="/"
          class="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Back to launcher"
        ><Icon
          name="lucide:arrow-left"
          aria-hidden="true"
        /></NuxtLink>
        <img
          src="/favicon.png"
          alt=""
          width="32"
          height="32"
        >
        <strong class="text-sm font-semibold tracking-tight sm:text-base">Verticale Paniek</strong>
        <span class="flex-1" />
        <ThemeToggle />
        <NuxtLink
          v-if="user"
          to="/account"
          class="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent transition hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Account"
        ><AvatarRoot><AvatarFallback>{{ initial }}</AvatarFallback></AvatarRoot></NuxtLink>
      </div>
    </header>
    <main class="mx-auto w-full max-w-4xl flex-1 px-4 pb-8 pt-4 sm:px-8 sm:pb-12 sm:pt-6">
      <slot />
    </main>
    <footer class="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-center text-xs text-muted">
      <BuildVersion />
    </footer>
    <UpdatePrompt />
  </div>
</template>

<script setup lang="ts">
import type { HeaderBack } from '~/composables/useHeaderBack'

const route = useRoute()
const { user } = useAuth()
const isHome = computed(() => route.path === '/')
const storedBack = useState<HeaderBack | null>('header-back', () => null)
const headerBack = computed(() => (storedBack.value?.path === route.path ? storedBack.value : null))
function goBack(back: HeaderBack) {
  if (typeof back.to === 'string') {
    void navigateTo(back.to)
  }
  else {
    back.to()
  }
}
const initial = computed(() => (user.value?.email?.[0] ?? '?').toUpperCase())
</script>
