<script setup lang="ts">
// Landing page for invite and password-reset emails (see hub/supabase/templates).
// The link carries a one-time token_hash in the query, which we exchange for a session.
const supabase = useSupabase()
const route = useRoute()
const error = ref('')

onMounted(async () => {
  const tokenHash = String(route.query.token_hash ?? '')
  const type = String(route.query.type ?? '')
  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) {
    error.value = 'This link is not valid.'
    return
  }
  const { error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (e) error.value = 'This link has expired or was already used. Ask an admin for a new one.'
  else await navigateTo('/auth/set-password', { replace: true })
})
</script>

<template>
  <section>
    <h1>Verifying…</h1>
    <template v-if="error">
      <p class="error" role="alert">{{ error }}</p>
      <p><NuxtLink to="/auth/login">Back to sign in</NuxtLink></p>
    </template>
  </section>
</template>
