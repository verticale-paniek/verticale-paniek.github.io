<script setup lang="ts">
const { buildVersion, buildTime } = useRuntimeConfig().public
</script>

<template>
  <small>build {{ buildVersion }} · {{ buildTime.slice(0, 16).replace('T', ' ') }} UTC</small>
</template>
