<template>
  <SwitchRoot
    v-model="dark"
    aria-label="Dark mode"
    :title="dark ? 'Switch to light mode' : 'Switch to dark mode'"
    class="inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-muted p-0.5 data-[state=checked]:bg-accent"
  >
    <SwitchThumb class="grid size-5 place-items-center rounded-full bg-white text-sm text-[#222021] transition-transform data-[state=checked]:translate-x-5">
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
  meta: [{ name: 'theme-color', content: () => dark.value ? '#222021' : '#f1f3f8' }],
})
</script>
