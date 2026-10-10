<script setup lang="ts">
const online = ref(true)
onMounted(() => {
  online.value = navigator.onLine
  window.addEventListener('online', () => (online.value = true))
  window.addEventListener('offline', () => (online.value = false))
})
</script>

<template>
  <section>
    <h1>Details</h1>
    <p>You are {{ online ? 'online' : 'offline' }}.</p>
  </section>
</template>
