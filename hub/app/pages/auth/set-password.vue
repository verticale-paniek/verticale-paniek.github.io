<template>
  <section class="mx-auto max-w-md rounded-2xl border border-outline/50 bg-surface p-6 shadow-sm sm:mt-6 sm:p-8">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
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
      class="grid gap-5"
      @submit.prevent="submit"
    >
      <Label class="grid gap-2 text-sm font-medium text-text">New password <input
        v-model="password"
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        type="password"
        autocomplete="new-password"
        :minlength="MIN_PASSWORD_LENGTH"
        required
      ></Label>
      <Label class="grid gap-2 text-sm font-medium text-text">Repeat password <input
        v-model="confirm"
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
        class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
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
