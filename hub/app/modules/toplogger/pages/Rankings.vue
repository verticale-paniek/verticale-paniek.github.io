<template>
  <section class="pb-20">
    <TlTabs />
    <div class="flex items-center gap-2">
      <h1 ref="heading" tabindex="-1" class="flex-1 text-2xl font-semibold tracking-tight">
        Rankings
      </h1>
      <select v-if="gyms.length" :value="state.gymId" aria-label="Selected gym" class="min-h-11 min-w-0 max-w-[50%] rounded-xl border border-outline bg-bg px-3 text-sm" @change="selectGym(($event.target as HTMLSelectElement).value)">
        <option v-for="gym in gyms" :key="gym.id" :value="gym.id">
          {{ gym.name }}
        </option>
      </select>
      <button class="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-text/5 disabled:opacity-50" aria-label="Refresh rankings" :disabled="busy || state.needsConnect" @click="fetchPage">
        <Icon name="lucide:refresh-cw" :class="{ 'animate-spin': busy }" aria-hidden="true" />
      </button>
    </div>
    <p class="mt-2 text-sm text-muted">
      Route rankings from TopLogger · All walls
    </p>
    <p v-if="state.needsConnect" class="my-6" role="status">
      <NuxtLink to="/account#toplogger" class="text-accent underline">Connect TopLogger</NuxtLink> to see gym rankings.
    </p>
    <template v-else>
      <div class="mt-5 flex gap-1 rounded-xl border border-outline bg-surface p-1" role="group" aria-label="Ranking type">
        <button
          v-for="option in (['grade', 'tops'] as const)"
          :key="option"
          class="min-h-11 flex-1 rounded-lg text-sm font-semibold capitalize focus-visible:outline-2 focus-visible:outline-accent"
          :class="metric === option ? 'bg-accent/15 text-accent' : 'text-muted'"
          :aria-pressed="metric === option"
          @click="metric = option"
        >
          {{ option }}
        </button>
      </div>
      <p class="my-3 text-sm text-muted">
        {{ metric === 'grade' ? 'TopLogger’s grade score, highest first.' : 'Currently visible routes topped, highest first.' }}
      </p>
      <p v-if="error || state.error" class="my-4 text-error" role="alert">
        {{ error || state.error }} <button class="min-h-11 px-2 underline" :disabled="busy" @click="retry">
          Retry
        </button>
      </p>
      <p v-if="busy || !ready" class="py-10 text-center text-muted" role="status">
        Loading rankings…
      </p>
      <template v-else-if="result">
        <p class="mb-3 text-sm text-muted" role="status">
          {{ result.pagination.total }} climbers · Page {{ result.pagination.page }} of {{ pages }}
        </p>
        <div v-if="result.data.length" class="overflow-hidden rounded-xl border border-outline bg-surface">
          <table class="w-full text-sm">
            <caption class="sr-only">
              {{ metric === 'grade' ? 'Grade' : 'Tops' }} rankings at {{ gyms.find(g => g.id === state.gymId)?.name }}
            </caption>
            <thead class="border-b border-outline bg-bg text-xs text-muted">
              <tr>
                <th scope="col" class="p-3 text-left">
                  #
                </th><th scope="col" class="py-3 text-left">
                  Climber
                </th><th scope="col" class="p-3 text-right">
                  {{ metric === 'grade' ? 'Grade' : 'Tops' }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline/50">
              <tr v-for="row in result.data" :key="row.user.id" :class="row.user.id === state.profile?.id ? 'bg-accent/10 font-semibold' : ''">
                <td class="w-12 p-3 tabular-nums text-muted">
                  {{ row.rank }}
                </td>
                <th scope="row" class="break-words py-3 pr-2 text-left font-medium">
                  {{ row.user.fullName || 'Unnamed climber' }}<span v-if="row.user.id === state.profile?.id" class="ml-2 text-xs text-accent">You</span>
                </th>
                <td class="whitespace-nowrap p-3 text-right font-semibold tabular-nums">
                  <template v-if="metric === 'grade'">
                    {{ gradeLabel(row.routesGrade!) }}<span class="block text-xs font-normal text-muted">{{ row.routesGrade }} points</span>
                  </template>
                  <template v-else>
                    {{ row.tickedVisibleCountRoutes }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="py-10 text-center text-muted" role="status">
          No ranked climbers for this gym yet.
        </p>
        <nav v-if="pages > 1" class="mt-4 flex items-center justify-between gap-3" aria-label="Ranking pages">
          <button class="min-h-11 rounded-lg border border-outline px-4 disabled:opacity-40" :disabled="page <= 1" @click="changePage(page - 1)">
            Previous
          </button>
          <span class="text-sm text-muted">{{ page }} / {{ pages }}</span>
          <button class="min-h-11 rounded-lg border border-outline px-4 disabled:opacity-40" :disabled="page >= pages" @click="changePage(page + 1)">
            Next
          </button>
        </nav>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import TlTabs from '../components/TlTabs.vue'
import { useTopLogger } from '../useTopLogger'
import { toploggerCall, type GymRankings } from '~/shell/toplogger/api'
import { FRENCH_GRADES, frenchGrade } from '~/shell/toplogger/domain'

const { state, gyms, load, refresh, selectGym } = useTopLogger()
const supabase = useSupabase()
const metric = ref<'grade' | 'tops'>('grade')
const page = ref(1)
const result = shallowRef<GymRankings | null>(null)
const busy = ref(false)
const ready = ref(false)
const error = ref('')
const heading = useTemplateRef<HTMLHeadingElement>('heading')
const pages = computed(() => Math.max(1, Math.ceil((result.value?.pagination.total ?? 0) / 30)))
let request = 0

function changePage(value: number) {
  page.value = value
  heading.value?.focus()
}

function gradeLabel(value: number) {
  return frenchGrade(FRENCH_GRADES.filter(grade => grade <= value).at(-1))
}

async function fetchPage() {
  const current = ++request
  result.value = null
  error.value = ''
  busy.value = false
  if (!ready.value || !state.gymId || state.needsConnect) {
    return
  }
  busy.value = true
  try {
    const data = await toploggerCall<GymRankings>(supabase, { action: 'rankings', gymId: state.gymId, metric: metric.value, page: page.value })
    if (current === request) {
      result.value = data
    }
  }
  catch (cause) {
    if (current === request) {
      error.value = cause instanceof Error ? cause.message : 'Rankings could not be loaded.'
    }
  }
  finally {
    if (current === request) {
      busy.value = false
    }
  }
}

async function retry() {
  if (state.error) {
    await refresh()
  }
  await fetchPage()
}

watch([() => state.gymId, metric], () => {
  page.value = 1
}, { flush: 'sync' })
watch([() => state.gymId, () => state.account, () => state.needsConnect, metric, page, ready], fetchPage)
onMounted(async () => {
  await load()
  ready.value = true
})
onBeforeUnmount(() => {
  request++
})
</script>
