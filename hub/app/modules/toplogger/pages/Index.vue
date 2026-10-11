<script setup lang="ts">
// POC: probes TopLogger two ways and shows the raw output: directly from the browser (expected to hit
// CORS) and through the toplogger-poc Edge Function.
const supabase = useSupabase()
const output = ref('')
const busy = ref(false)
const token = ref('') // transient: never stored; sent only to TopLogger (direct) or in the function request body

const URL = 'https://app.toplogger.nu/graphql'
const PROBES: Record<string, { query: string, variables: Record<string, unknown>, authorized?: boolean }> = {
  userMe: { query: 'query PlusUser { userMe { id fullName } }', variables: {} },
  refreshInvalid: {
    query: 'mutation authSigninRefreshToken($refreshToken: JWT!) { tokens: authSigninRefreshToken(refreshToken: $refreshToken) { access { token expiresAt } refresh { token expiresAt } } }',
    variables: { refreshToken: 'invalid' },
  },
}

function describeError(e: unknown) {
  const err = e as Error & { cause?: unknown }
  return { name: err?.name, message: err?.message, cause: err?.cause ? String(err.cause) : undefined, stack: err?.stack }
}

async function directProbe(payload: { query: string, variables: Record<string, unknown>, authorized?: boolean }) {
  const started = performance.now()
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(payload.authorized ? { Authorization: `Bearer ${token.value.trim()}` } : {}) },
      body: JSON.stringify({ query: payload.query, variables: payload.variables }),
      signal: AbortSignal.timeout(30000),
    })
    const text = await response.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    }
    catch { /* not JSON, show raw */ }
    return { ms: Math.round(performance.now() - started), status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), body }
  }
  catch (e) {
    return { ms: Math.round(performance.now() - started), exception: describeError(e), hint: 'A "Failed to fetch" TypeError is how browsers report a CORS block; the real reason is in the devtools console/network tab.' }
  }
}

async function runDirect() {
  busy.value = true
  output.value = ''
  const probes = { ...PROBES }
  if (token.value.trim()) probes.userMeWithToken = { ...PROBES.userMe!, authorized: true }
  const results: Record<string, unknown> = {}
  for (const [name, payload] of Object.entries(probes)) results[name] = await directProbe(payload)
  output.value = JSON.stringify({ via: 'browser, direct', results }, null, 2)
  busy.value = false
}

async function runViaFunction() {
  busy.value = true
  output.value = ''
  const started = performance.now()
  try {
    const { data, error } = await supabase.functions.invoke('toplogger-poc', { body: { accessToken: token.value.trim() } })
    const roundTripMs = Math.round(performance.now() - started)
    if (error) {
      // The shape of error.context differs between supabase-js versions: show whatever it is.
      const ctx = (error as { context?: unknown }).context
      let detail: unknown = ctx
      if (ctx && typeof (ctx as Response).text === 'function') {
        const response = ctx as Response
        detail = { status: response.status, body: await response.text().catch(() => '') }
      }
      output.value = JSON.stringify({ via: 'edge function', roundTripMs, error: describeError(error), context: detail }, null, 2)
    }
    else {
      output.value = JSON.stringify({ via: 'edge function', roundTripMs, result: data }, null, 2)
    }
  }
  catch (e) {
    output.value = JSON.stringify({ via: 'edge function', exception: describeError(e) }, null, 2)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section>
    <h1>TopLogger POC</h1>
    <p>
      <label>Access token (optional)<br>
        <input v-model="token" type="password" autocomplete="off" style="width: 100%;">
      </label>
    </p>
    <p>
      <button :disabled="busy" @click="runDirect">{{ busy ? 'Calling...' : 'Direct from browser' }}</button>
      <button :disabled="busy" @click="runViaFunction">{{ busy ? 'Calling...' : 'Via Edge Function' }}</button>
    </p>
    <pre v-if="output" style="overflow-x: auto; white-space: pre-wrap; word-break: break-all;">{{ output }}</pre>
  </section>
</template>
