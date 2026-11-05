<template>
  <section id="toplogger" class="scroll-mt-6 rounded-2xl border border-outline/50 bg-surface p-5 sm:p-6" aria-labelledby="toplogger-heading" :aria-busy="busy">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="toplogger-heading" class="text-lg font-semibold">
        TopLogger
      </h2>
      <span v-if="state" class="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium" :class="state.connected ? 'text-accent' : 'text-muted'">
        {{ state.connected ? 'Connected' : state.status === 'reconnect_required' ? 'Reconnect needed' : 'Not connected' }}
      </span>
    </div>
    <p class="mt-2 text-sm text-muted">
      Connect your climbing account to browse routes and track your ascents.
    </p>
    <p
      v-if="!state && !error"
      class="my-4"
    >
      Checking connection…
    </p>

    <template v-if="state?.connected">
      <p class="my-4">
        {{ profile?.fullName ? `Connected as ${profile.fullName}.` : 'Your climbing account is connected.' }} Your connection renews automatically when you use it.
      </p>
      <p class="my-4 flex flex-wrap gap-3">
        <button
          class="min-h-11 rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-error transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="busy"
          @click="disconnect"
        >
          {{ busy ? 'Please wait…' : 'Disconnect TopLogger' }}
        </button>
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
        Use a TopLogger refresh token to connect. Connecting may sign you out of the TopLogger web app.
      </p>
      <form
        class="grid max-w-96 gap-5"
        @submit.prevent="connect"
      >
        <Label class="grid gap-2 text-sm font-medium text-text">TopLogger refresh token
          <input
            v-model="refreshToken"
            class="w-full min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            type="password"
            autocomplete="off"
            :disabled="busy"
            required
            aria-describedby="token-help"
          >
        </Label>
        <p id="token-help" class="text-xs text-muted">
          Your token is stored encrypted and cleared from this form after you submit it. Each token can only be used once.
        </p>
        <p class="my-4">
          <button
            class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            :disabled="busy || !refreshToken.trim()"
          >
            {{ busy ? 'Connecting…' : 'Connect TopLogger' }}
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
    <button v-if="error" type="button" class="min-h-11 text-sm font-semibold text-accent underline disabled:opacity-50" :disabled="busy" @click="loadStatus">
      Try again
    </button>
  </section>
</template>

<script setup lang="ts">
import { toploggerCall, type ConnectionState, type Profile } from '~/shell/toplogger/api'
import { useTopLogger } from '../useTopLogger'

const supabase = useSupabase()
const { reset } = useTopLogger()
const state = ref<ConnectionState | null>(null)
const profile = ref<Profile | null>(null)
const refreshToken = ref('')
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
  profile.value = null
  if (state.value.connected) {
    profile.value = await toploggerCall<Profile>(supabase, { action: 'profile' })
  }
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
    reset()
    await loadStatus()
  }
}

async function disconnect() {
  const result = await run(() => toploggerCall(supabase, { action: 'disconnect' }))
  if (result) {
    reset()
    await loadStatus()
  }
}
</script>
