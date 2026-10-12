<template>
  <section>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
      Hello A
    </h1>
    <p class="my-4">
      Taps: {{ count }}
    </p>
    <button
      class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      @click="tap"
    >
      Tap
    </button>
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
// Per-user data example: the count is stored in hello_a_counters, protected by RLS.
const supabase = useSupabase()
const { user } = useAuth()
const count = ref(0)
const error = ref('')

onMounted(async () => {
  const { data, error: e } = await supabase.from('hello_a_counters').select('count').maybeSingle()
  if (e) {
    error.value = 'Could not load your count.'
  }
  else {
    count.value = data?.count ?? 0
  }
})

async function tap() {
  count.value++
  const { error: e } = await supabase.from('hello_a_counters').upsert({
    user_id: user.value!.id,
    count: count.value,
    updated_at: new Date().toISOString(),
  })
  error.value = e ? 'Could not save your count.' : ''
}
</script>
