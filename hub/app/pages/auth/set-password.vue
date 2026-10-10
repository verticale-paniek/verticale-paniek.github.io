<script setup lang="ts">
import { MIN_PASSWORD_LENGTH, passwordError } from '~/shell/auth'

const supabase = useSupabase()
const { user } = useAuth()
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = passwordError(password.value, confirm.value) ?? ''
  if (error.value) return
  busy.value = true
  const { error: e } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (e) error.value = 'Could not set the password. Try a different one, or request a new link.'
  else await navigateTo('/')
}
</script>

<template>
  <section>
    <h1>Choose a password</h1>
    <p v-if="!user" class="error">
      No active link. <NuxtLink to="/auth/login">Back to sign in</NuxtLink>
    </p>
    <form v-else @submit.prevent="submit">
      <label>New password <input v-model="password" type="password" autocomplete="new-password" :minlength="MIN_PASSWORD_LENGTH" required></label>
      <label>Repeat password <input v-model="confirm" type="password" autocomplete="new-password" required></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button :disabled="busy">Save password</button>
    </form>
  </section>
</template>
