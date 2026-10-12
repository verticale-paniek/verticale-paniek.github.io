<template>
  <div
    v-if="$pwa?.needRefresh"
    class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-outline/50 bg-surface p-4 text-sm shadow-lg"
    role="alert"
  >
    <span class="flex-1">A new version is available.</span>
    <button
      class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      @click="$pwa.updateServiceWorker()"
    >
      Update
    </button>
    <button
      class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      @click="$pwa.cancelPrompt()"
    >
      Later
    </button>
  </div>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp()
</script>
