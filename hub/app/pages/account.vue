<template>
  <section v-if="user" class="max-w-2xl">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
      Account
    </h1>
    <dl class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-4 rounded-2xl border border-outline/50 bg-surface p-5 text-sm sm:p-6">
      <dt class="text-muted">
        Email
      </dt>
      <dd class="m-0 break-words font-medium">
        {{ user.email }}
      </dd>
      <dt class="text-muted">
        Role
      </dt>
      <dd class="m-0 break-words font-medium">
        {{ isAdmin ? 'Admin' : 'Member' }}
      </dd>
      <dt class="text-muted">
        Member since
      </dt>
      <dd class="m-0 break-words font-medium">
        {{ formatDate(user.created_at) }}
      </dd>
      <dt class="text-muted">
        Last sign-in
      </dt>
      <dd class="m-0 break-words font-medium">
        {{ formatDate(user.last_sign_in_at) }}
      </dd>
    </dl>

    <CollapsibleRoot :unmount-on-hide="false">
      <CollapsibleTrigger class="mt-6 flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-accent">
        Change password
        <Icon name="lucide:chevron-down" class="text-muted" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <form
          class="mb-4 mt-4 grid max-w-96 gap-5"
          @submit.prevent="changePassword"
        >
          <Label class="grid gap-2 text-sm font-medium text-text">Current password <input
            v-model="current"
            class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            type="password"
            autocomplete="current-password"
            required
          ></Label>
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
          <p
            v-if="saved"
            class="my-4 text-muted"
          >
            Password changed.
          </p>
          <button
            class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="busy"
          >
            Change password
          </button>
        </form>
      </CollapsibleContent>
    </CollapsibleRoot>

    <p class="my-4">
      <button
        class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
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
        class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
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
