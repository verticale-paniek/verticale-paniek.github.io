<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
      Sign in
    </h1>
    <form
      class="grid max-w-96 gap-3"
      @submit.prevent="submit"
    >
      <Label class="grid gap-1 text-[0.9rem] text-muted">Email <input
        v-model="email"
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
        type="email"
        autocomplete="username"
        required
      ></Label>
      <Label class="grid gap-1 text-[0.9rem] text-muted">Password <input
        v-model="password"
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
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
        class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
        :disabled="busy"
      >
        Sign in
      </button>
    </form>
    <p class="my-4 text-muted">
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
