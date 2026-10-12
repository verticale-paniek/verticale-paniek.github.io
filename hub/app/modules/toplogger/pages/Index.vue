<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
      TopLogger
    </h1>
    <p
      v-if="!state && !error"
      class="my-4"
    >
      Loading...
    </p>

    <template v-if="state?.connected">
      <p class="my-4">
        Connected. Last refreshed {{ new Date(state.updatedAt!).toLocaleString() }}; valid until {{ new Date(state.refreshExpiresAt!).toLocaleString() }} and renewed whenever it is used.
      </p>
      <p class="my-4">
        <button
          class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
          :disabled="busy"
          @click="loadProfile"
        >
          Load my profile
        </button>
        <button
          class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
          :disabled="busy"
          @click="disconnect"
        >
          Disconnect
        </button>
      </p>
      <p
        v-if="profile"
        class="my-4"
      >
        {{ profile.fullName }}<span v-if="profile.gym"> · {{ profile.gym.name }}</span>
      </p>
    </template>

    <template v-else-if="state">
      <p
        v-if="state.status === 'reconnect_required'"
        class="my-4"
      >
        Your TopLogger connection expired. Connect again.
      </p>
      <p class="my-4">
        Paste your TopLogger refresh token. It is sent once to our server, stored encrypted, and cleared from this
        page. Each token works once, and connecting may sign you out of the TopLogger web app.
      </p>
      <form
        class="grid max-w-96 gap-3"
        @submit.prevent="connect"
      >
        <Label class="grid gap-1 text-[0.9rem] text-muted">Refresh token<br>
          <input
            v-model="refreshToken"
            class="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-text"
            type="password"
            autocomplete="off"
          >
        </Label>
        <p class="my-4">
          <button
            class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
            type="submit"
            :disabled="busy || !refreshToken.trim()"
          >
            Connect
          </button>
        </p>
      </form>
    </template>

    <p
      v-if="error"
      class="my-4 text-error"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { toploggerCall, type ConnectionState, type Profile } from '../api'

const supabase = useSupabase()
const state = ref<ConnectionState | null>(null)
const profile = ref<Profile | null>(null)
const refreshToken = ref('') // transient: cleared right after submitting, never stored
const error = ref('')
const busy = ref(false)

async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
  busy.value = true
  error.value = ''
  try {
    return await work()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  }
  finally {
    busy.value = false
  }
}

const loadStatus = () => run(async () => {
  state.value = await toploggerCall<ConnectionState>(supabase, { action: 'status' })
})

onMounted(loadStatus)

async function connect() {
  const token = refreshToken.value.trim()
  refreshToken.value = ''
  if (!token) {
    return
  }
  const result = await run(() => toploggerCall(supabase, { action: 'connect', refreshToken: token }))
  if (result) {
    profile.value = null
    await loadStatus()
  }
}

async function disconnect() {
  const result = await run(() => toploggerCall(supabase, { action: 'disconnect' }))
  if (result) {
    profile.value = null
    await loadStatus()
  }
}

async function loadProfile() {
  const result = await run(() => toploggerCall<Profile>(supabase, { action: 'profile' }))
  if (result) {
    profile.value = result
  }
  // Also after success: the call may have refreshed the tokens, or an expired connection shows up here.
  await loadStatus()
}
</script>
