<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.path === '/')
</script>

<template>
  <div class="shell">
    <header>
      <NuxtLink v-if="!isHome" to="/" aria-label="Back to launcher">←</NuxtLink>
      <strong>Verticale Paniek</strong>
    </header>
    <main><slot /></main>
    <footer><BuildVersion /></footer>
    <UpdatePrompt />
  </div>
</template>

<style scoped>
.shell { min-height: 100dvh; display: flex; flex-direction: column; }
header { display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem 1rem; background: var(--surface); }
header a { text-decoration: none; font-size: 1.25rem; }
main { flex: 1; padding: 1rem; }
footer { padding: 0.75rem 1rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
</style>
