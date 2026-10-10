<script setup lang="ts">
const route = useRoute()
const { user } = useAuth()
const isHome = computed(() => route.path === '/')
const initial = computed(() => (user.value?.email?.[0] ?? '?').toUpperCase())
</script>

<template>
  <div class="shell">
    <header>
      <NuxtLink v-if="!isHome && user" to="/" class="back" aria-label="Back to launcher">←</NuxtLink>
      <img src="/favicon.png" alt="" width="28" height="28">
      <strong>Verticale Paniek</strong>
      <span class="spacer" />
      <NuxtLink v-if="user" to="/account" class="avatar" aria-label="Account">{{ initial }}</NuxtLink>
    </header>
    <main><slot /></main>
    <footer><BuildVersion /></footer>
    <UpdatePrompt />
  </div>
</template>

<style scoped>
.shell { min-height: 100dvh; display: flex; flex-direction: column; }
header { display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem 1rem; background: var(--surface); }
.back { font-size: 1.25rem; text-decoration: none; }
.spacer { flex: 1; }
.avatar {
  display: grid; place-items: center; width: 2rem; height: 2rem;
  border-radius: 50%; background: var(--accent); color: var(--bg);
  font-weight: 700; text-decoration: none;
}
main { flex: 1; padding: 1rem; }
footer { padding: 0.75rem 1rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
</style>
