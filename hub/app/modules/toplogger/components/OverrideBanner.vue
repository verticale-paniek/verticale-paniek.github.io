<template>
  <div class="my-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100" role="status">
    <div class="min-w-0">
      <p class="font-bold">
        Override mode · Viewing {{ name }}
      </p>
      <p class="text-sm">
        Read-only list and map · {{ busy ? 'Loading progress…' : 'Showing this climber’s progress' }}
      </p>
      <p v-if="error" class="text-sm">
        {{ error }} <button class="min-h-11 underline" @click="$emit('retry')">
          Retry
        </button>
      </p>
    </div>
    <button class="min-h-11 rounded-lg border border-current px-3 text-sm font-semibold" @click="$emit('exit')">
      Back to my view
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ name: string, busy: boolean, error: string }>()
defineEmits<{ exit: [], retry: [] }>()
</script>
