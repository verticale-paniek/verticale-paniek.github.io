<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
      Hello A
    </h1>
    <p class="my-4">
      Taps: {{ count }}
    </p>
    <button
      class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
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
