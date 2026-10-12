<template>
  <small class="text-[smaller]">build {{ buildVersion }} · {{ buildTime.slice(0, 16).replace('T', ' ') }} UTC</small>
</template>

<script setup lang="ts">
const { buildVersion, buildTime } = useRuntimeConfig().public
</script>
