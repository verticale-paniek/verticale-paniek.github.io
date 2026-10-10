<script setup lang="ts">
const supabase = useSupabase()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  busy.value = false
  if (e) error.value = 'Sign-in failed. Check your email and password.'
  else await navigateTo('/')
}
</script>

<template>
  <section>
    <h1>Sign in</h1>
    <form @submit.prevent="submit">
      <label>Email <input v-model="email" type="email" autocomplete="username" required></label>
      <label>Password <input v-model="password" type="password" autocomplete="current-password" required></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button :disabled="busy">Sign in</button>
    </form>
    <p class="notice">This app is invite-only. Forgot your password or need an invitation? Ask an admin for a new link.</p>
  </section>
</template>
