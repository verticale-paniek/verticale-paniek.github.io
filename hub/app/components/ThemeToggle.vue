<template>
  <SwitchRoot
    v-model="dark"
    aria-label="Dark mode"
    :title="dark ? 'Switch to light mode' : 'Switch to dark mode'"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-bg p-0.5 ring-1 ring-inset ring-outline/50 transition after:absolute after:-inset-x-1 after:-inset-y-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=checked]:bg-accent/15"
  >
    <SwitchThumb class="grid size-5 place-items-center rounded-full bg-surface text-xs text-muted shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:text-accent">
      <Icon
        :name="dark ? 'lucide:moon' : 'lucide:sun'"
        aria-hidden="true"
      />
    </SwitchThumb>
  </SwitchRoot>
</template>

<script setup lang="ts">
const mode = useColorMode({ storageKey: 'theme', initialValue: 'dark' })
const dark = computed({
  get: () => mode.value === 'dark',
  set: (value) => { mode.value = value ? 'dark' : 'light' },
})

useHead({
  meta: [
    { name: 'theme-color', content: () => dark.value ? '#0f172a' : '#f8fafc' },
    { name: 'color-scheme', content: () => dark.value ? 'dark' : 'light' },
  ],
})
</script>
