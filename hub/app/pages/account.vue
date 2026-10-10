<script setup lang="ts">
import { MIN_PASSWORD_LENGTH, passwordError } from '~/shell/auth'

const supabase = useSupabase()
const { user, isAdmin, signOut } = useAuth()

const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : 'unknown')

const current = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const saved = ref(false)
const busy = ref(false)

async function changePassword() {
  saved.value = false
  error.value = passwordError(password.value, confirm.value) ?? ''
  if (error.value) return
  busy.value = true
  // Supabase does not check the current password on update, so verify it by signing in again.
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.value!.email!, password: current.value })
  if (authError) {
    busy.value = false
    error.value = 'Your current password is not correct.'
    return
  }
  const { error: e } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (e) {
    error.value = 'Could not change the password. Try a different one.'
    return
  }
  current.value = ''
  password.value = ''
  confirm.value = ''
  saved.value = true
}
</script>

<template>
  <section v-if="user">
    <h1>Account</h1>
    <dl>
      <dt>Email</dt>
      <dd>{{ user.email }}</dd>
      <dt>Role</dt>
      <dd>{{ isAdmin ? 'Admin' : 'Member' }}</dd>
      <dt>Member since</dt>
      <dd>{{ formatDate(user.created_at) }}</dd>
      <dt>Last sign-in</dt>
      <dd>{{ formatDate(user.last_sign_in_at) }}</dd>
    </dl>

    <details>
      <summary>Change password</summary>
      <form @submit.prevent="changePassword">
        <label>Current password <input v-model="current" type="password" autocomplete="current-password" required></label>
        <label>New password <input v-model="password" type="password" autocomplete="new-password" :minlength="MIN_PASSWORD_LENGTH" required></label>
        <label>Repeat password <input v-model="confirm" type="password" autocomplete="new-password" required></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="saved" class="notice">Password changed.</p>
        <button :disabled="busy">Change password</button>
      </form>
    </details>

    <p><button class="ghost" @click="signOut()">Sign out</button></p>

    <p v-if="isAdmin"><button @click="navigateTo('/admin')">Admin</button></p>
  </section>
</template>

<style scoped>
summary { cursor: pointer; margin: 1rem 0; font-weight: 600; }
form { margin-bottom: 1rem; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
dt { color: var(--muted); }
dd { margin: 0; }
</style>
