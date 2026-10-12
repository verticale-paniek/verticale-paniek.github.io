<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
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
