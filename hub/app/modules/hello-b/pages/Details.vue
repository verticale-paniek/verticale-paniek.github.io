<template>
  <section>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
      Details
    </h1>
    <p class="my-4">
      You are {{ online ? 'online' : 'offline' }}.
    </p>
  </section>
</template>

<script setup lang="ts">
const online = useOnline()
</script>
