<script setup lang="ts">
// Per-user data example: the count is stored in hello_a_counters, protected by RLS.
const supabase = useSupabase()
const { user } = useAuth()
const count = ref(0)
const error = ref('')

onMounted(async () => {
  const { data, error: e } = await supabase.from('hello_a_counters').select('count').maybeSingle()
  if (e) error.value = 'Could not load your count.'
  else count.value = data?.count ?? 0
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

<template>
  <section>
    <h1>Hello A</h1>
    <p>Taps: {{ count }}</p>
    <button @click="tap">Tap</button>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>
