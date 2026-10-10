<script setup lang="ts">
import { modules } from '~/shell/modules'
</script>

<template>
  <ul class="launcher">
    <li v-for="m in modules" :key="m.id">
      <NuxtLink :to="`/${m.id}`">
        <span class="icon">{{ m.icon }}</span>
        <span>
          <strong>{{ m.name }}</strong>
          <small v-if="m.description">{{ m.description }}</small>
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>

<style scoped>
.launcher { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
a { display: flex; gap: 1rem; align-items: center; padding: 1rem; border-radius: 12px; background: var(--surface); color: var(--text); text-decoration: none; }
.icon { font-size: 2rem; }
small { display: block; color: var(--muted); }
</style>
