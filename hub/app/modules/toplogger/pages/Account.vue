<template>
  <p class="text-sm text-muted">
    Opening account settings…
  </p>
</template>

<script setup lang="ts">
await navigateTo('/account#toplogger', { replace: true })
</script>
