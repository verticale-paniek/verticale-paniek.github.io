<template>
  <ul class="m-0 grid list-none gap-3 p-0">
    <li
      v-for="m in modules"
      :key="m.id"
    >
      <NuxtLink
        class="flex items-center gap-4 rounded-xl bg-surface p-4 text-text no-underline"
        :to="`/${m.id}`"
      >
        <span class="text-[2rem]">{{ m.icon }}</span>
        <span>
          <strong>{{ m.name }}</strong>
          <small
            v-if="m.description"
            class="text-[smaller] block text-muted"
          >{{ m.description }}</small>
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { modules } from '~/shell/modules'
</script>
