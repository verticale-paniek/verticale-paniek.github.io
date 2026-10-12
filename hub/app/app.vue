<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { user } = useAuth()
const route = useRoute()

// Session ended elsewhere (sign-out in another tab, revoked token): leave protected pages.
watch(user, (value) => {
  if (!value && !route.path.startsWith('/auth/')) {
    navigateTo('/auth/login')
  }
})
</script>
