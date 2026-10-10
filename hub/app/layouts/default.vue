<script setup lang="ts">
const route = useRoute()
const { user, isAdmin, signOut } = useAuth()
const isHome = computed(() => route.path === '/')
</script>

<template>
  <div class="shell">
    <header>
      <NuxtLink v-if="!isHome && user" to="/" aria-label="Back to launcher">←</NuxtLink>
      <img src="/favicon.png" alt="" width="28" height="28">
      <strong>Verticale Paniek</strong>
      <span class="spacer" />
      <NuxtLink v-if="isAdmin" to="/admin">Admin</NuxtLink>
      <button v-if="user" class="ghost" @click="signOut()">Sign out</button>
    </header>
    <main><slot /></main>
    <footer><BuildVersion /></footer>
    <UpdatePrompt />
  </div>
</template>

<style scoped>
.shell { min-height: 100dvh; display: flex; flex-direction: column; }
header { display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem 1rem; background: var(--surface); }
header a { text-decoration: none; }
header a[aria-label] { font-size: 1.25rem; }
.spacer { flex: 1; }
main { flex: 1; padding: 1rem; }
footer { padding: 0.75rem 1rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
</style>
