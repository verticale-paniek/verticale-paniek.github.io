<template>
  <div
    v-if="$pwa?.needRefresh"
    class="fixed inset-x-4 bottom-4 flex items-center gap-2 rounded-xl bg-surface px-4 py-3 shadow-[0_4px_16px_#0008]"
    role="alert"
  >
    <span class="flex-1">A new version is available.</span>
    <button
      class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
      @click="$pwa.updateServiceWorker()"
    >
      Update
    </button>
    <button
      class="rounded-lg px-4 py-2 disabled:opacity-50 bg-transparent text-muted"
      @click="$pwa.cancelPrompt()"
    >
      Later
    </button>
  </div>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>
