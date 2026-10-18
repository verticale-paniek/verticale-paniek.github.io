<template>
  <section class="pb-20">
    <TlTabs />
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
      TopLogger account
    </h1>
    <p
      v-if="!state && !error"
      class="my-4"
    >
      Loading...
    </p>

    <template v-if="state?.connected">
      <p class="my-4">
        Connected<span v-if="profile"> as <strong>{{ profile.fullName }}</strong></span>. Last refreshed {{ new Date(state.updatedAt!).toLocaleString() }}; valid until {{ new Date(state.refreshExpiresAt!).toLocaleString() }} and renewed whenever it is used.
      </p>
      <p class="my-4 flex flex-wrap gap-3">
        <button
          class="min-h-11 rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-error transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="busy"
          @click="disconnect"
        >
          Disconnect
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
        Paste your TopLogger refresh token. It is sent once to our server, stored encrypted, and cleared from this
        page. Each token works once, and connecting may sign you out of the TopLogger web app.
      </p>
      <form
        class="grid max-w-96 gap-5"
        @submit.prevent="connect"
      >
        <Label class="grid gap-2 text-sm font-medium text-text">Refresh token<br>
          <input
            v-model="refreshToken"
            class="w-full min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            type="password"
            autocomplete="off"
          >
        </Label>
        <p class="my-4">
          <button
            class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
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
import { toploggerCall, type ConnectionState } from '~/shell/toplogger/api'
import TlTabs from '../components/TlTabs.vue'
import { useTopLogger } from '../useTopLogger'

const supabase = useSupabase()
const { state: tl, reset } = useTopLogger()
const state = ref<ConnectionState | null>(null)
const profile = computed(() => tl.profile)
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
    reset() // a different TopLogger account may now be connected: drop everything cached for the old one
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
