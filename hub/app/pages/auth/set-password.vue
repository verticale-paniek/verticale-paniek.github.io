<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
      Choose a password
    </h1>
    <p
      v-if="!user"
      class="my-4 text-error"
    >
      No active link. <NuxtLink
        class="text-accent underline"
        to="/auth/login"
      >Back to sign in</NuxtLink>
    </p>
    <form
      v-else
      class="grid max-w-96 gap-3"
      @submit.prevent="submit"
    >
      <Label class="grid gap-1 text-[0.9rem] text-muted">New password <input
        v-model="password"
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
        type="password"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
        required
      ></Label>
      <Label class="grid gap-1 text-[0.9rem] text-muted">Repeat password <input
        v-model="confirm"
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
        type="password"
        autocomplete="new-password"
        required
      ></Label>
      <p
        v-if="error"
        class="my-4 text-error"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
        :disabled="busy"
      >
        Save password
      </button>
    </form>
  </section>
</template>

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
  if (error.value) {
    return
  }
  busy.value = true
  const { error: e } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (e) {
    error.value = 'Could not set the password. Try a different one, or request a new link.'
  }
  else {
    await navigateTo('/')
  }
}
</script>
