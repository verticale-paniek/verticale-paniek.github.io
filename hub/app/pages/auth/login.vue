<template>
  <section class="mx-auto max-w-md rounded-2xl border border-outline/50 bg-surface p-6 shadow-sm sm:mt-6 sm:p-8">
    <h1 class="mb-2 text-2xl font-semibold tracking-tight">
      Sign in
    </h1>
    <p class="mb-8 text-sm text-muted">
      Welcome back to your climbing hub.
    </p>
    <form
      class="grid gap-5"
      @submit.prevent="submit"
    >
      <Label class="grid gap-2 text-sm font-medium text-text">Email <input
        v-model="email"
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        type="email"
        autocomplete="username"
        required
      ></Label>
      <Label class="grid gap-2 text-sm font-medium text-text">Password <input
        v-model="password"
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        type="password"
        autocomplete="current-password"
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
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
    <p class="mt-6 border-t border-outline/50 pt-6 text-sm leading-relaxed text-muted">
      This app is invite-only. Forgot your password or need an invitation? Ask an admin for a new link.
    </p>
  </section>
</template>

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
  if (e) {
    error.value = 'Sign-in failed. Check your email and password.'
  }
  else {
    await navigateTo('/')
  }
}
</script>
