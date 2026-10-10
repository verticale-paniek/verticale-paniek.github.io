<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>

<template>
  <div v-if="$pwa?.needRefresh" class="prompt" role="alert">
    <span>A new version is available.</span>
    <button @click="$pwa.updateServiceWorker()">Update</button>
    <button class="ghost" @click="$pwa.cancelPrompt()">Later</button>
  </div>
</template>

<style scoped>
.prompt {
  position: fixed; left: 1rem; right: 1rem; bottom: 1rem;
  display: flex; gap: 0.5rem; align-items: center;
  padding: 0.75rem 1rem; border-radius: 12px;
  background: var(--surface); box-shadow: 0 4px 16px #0008;
}
.prompt span { flex: 1; }
.ghost { background: transparent; color: var(--muted); }
</style>
