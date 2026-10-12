<template>
  <section v-if="user">
    <h1 class="my-[0.67em] text-[2em] font-bold">
      Account
    </h1>
    <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
      <dt class="text-muted">
        Email
      </dt>
      <dd class="m-0">
        {{ user.email }}
      </dd>
      <dt class="text-muted">
        Role
      </dt>
      <dd class="m-0">
        {{ isAdmin ? 'Admin' : 'Member' }}
      </dd>
      <dt class="text-muted">
        Member since
      </dt>
      <dd class="m-0">
        {{ formatDate(user.created_at) }}
      </dd>
      <dt class="text-muted">
        Last sign-in
      </dt>
      <dd class="m-0">
        {{ formatDate(user.last_sign_in_at) }}
      </dd>
    </dl>

    <CollapsibleRoot :unmount-on-hide="false">
      <CollapsibleTrigger class="my-4 cursor-pointer bg-transparent p-0 font-semibold text-text">
        Change password
      </CollapsibleTrigger>
      <CollapsibleContent>
        <form
          class="mb-4 grid max-w-96 gap-3"
          @submit.prevent="changePassword"
        >
          <Label class="grid gap-1 text-[0.9rem] text-muted">Current password <input
            v-model="current"
            class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
            type="password"
            autocomplete="current-password"
            required
          ></Label>
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
          <p
            v-if="saved"
            class="my-4 text-muted"
          >
            Password changed.
          </p>
          <button
            class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
            :disabled="busy"
          >
            Change password
          </button>
        </form>
      </CollapsibleContent>
    </CollapsibleRoot>

    <p class="my-4">
      <button
        class="rounded-lg px-4 py-2 disabled:opacity-50 bg-transparent text-muted"
        @click="signOut()"
      >
        Sign out
      </button>
    </p>

    <p
      v-if="isAdmin"
      class="my-4"
    >
      <button
        class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
        @click="navigateTo('/admin')"
      >
        Admin
      </button>
    </p>
  </section>
</template>

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
  if (error.value) {
    return
  }
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
