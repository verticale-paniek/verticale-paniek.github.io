<template>
  <section class="pb-20">
    <TlTabs />

    <button
      class="mb-3 flex min-h-11 items-center gap-1.5 text-sm text-accent focus-visible:outline-2 focus-visible:outline-accent"
      @click="back"
    >
      <Icon
        name="lucide:arrow-left"
        aria-hidden="true"
      />
      Back to routes
    </button>

    <p
      v-if="state.needsConnect"
      class="my-4 rounded-xl border border-outline/50 bg-surface p-4"
      role="status"
    >
      TopLogger is not connected. <NuxtLink
        class="font-semibold text-accent underline"
        to="/toplogger/account"
      >
        Connect your account
      </NuxtLink> to continue.
    </p>
    <p
      v-if="detail.error"
      class="my-4 text-error"
      role="alert"
    >
      {{ detail.error }} <button
        class="underline"
        @click="openRoute(id)"
      >
        Retry
      </button>
    </p>
    <p
      v-if="!route && detail.loading"
      class="my-6 text-muted"
      role="status"
    >
      Loading route…
    </p>

    <template v-if="route">
      <header class="flex items-center justify-between gap-3 border-b border-outline/50 pb-4">
        <div class="min-w-0">
          <span class="text-xs text-muted">{{ route.wall?.nameLoc || 'Route details' }}</span>
          <h1 class="mt-1 text-3xl font-semibold tracking-tight">
            {{ frenchGrade(route.grade) }}
            <span class="block text-base font-normal">{{ route.name || (route.label ? `Rope ${route.label}` : 'Route') }}</span>
          </h1>
          <span
            class="mt-2 inline-block rounded border px-1.5 py-0.5 text-xs"
            :class="topped ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400' : 'border-outline text-muted'"
          >{{ ascentLabel(route.climbUser?.tickType) }}</span>
          <span
            v-if="isNewRoute(route.inAt)"
            class="ml-2 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent"
          >New</span>
        </div>
        <span
          class="size-7 shrink-0 rounded-full border border-outline"
          :style="{ background: colorValue(route.holdColor?.color) }"
          aria-hidden="true"
        />
      </header>

      <div
        v-if="isActive(route) || topped"
        class="mt-3 rounded-xl border border-outline/50 bg-surface p-4"
      >
        <div
          class="flex gap-2"
          role="group"
          aria-label="Log ascent"
        >
          <button
            v-for="type in [3, 2, 1] as const"
            :key="type"
            class="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-1.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :class="{ 'ring-2 ring-accent ring-offset-2 ring-offset-surface': route.climbUser?.tickType === type }"
            :aria-pressed="route.climbUser?.tickType === type"
            :aria-busy="detail.action === `ascent:${type}`"
            :disabled="locked || !isActive(route) || !!route.climbUser?.tickType || (type > 1 && !!route.climbUser?.totalTries)"
            @click="submitAscent(type)"
          >
            <Icon
              :name="detail.action === `ascent:${type}` ? 'lucide:loader-circle' : type === 3 ? 'lucide:check-check' : type === 2 ? 'lucide:zap' : 'lucide:check'"
              :class="{ 'animate-spin': detail.action === `ascent:${type}` }"
              aria-hidden="true"
            />
            {{ ascentLabel(type) }}
          </button>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button
            class="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline px-3 text-sm font-semibold transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :aria-busy="detail.action === 'ascent:0'"
            :disabled="locked || !isActive(route)"
            @click="submitAscent(0)"
          >
            <Icon
              :name="detail.action === 'ascent:0' ? 'lucide:loader-circle' : 'lucide:plus'"
              :class="{ 'animate-spin': detail.action === 'ascent:0' }"
              aria-hidden="true"
            />
            Try
          </button>
          <button
            v-if="topped"
            class="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline px-3 text-sm font-semibold transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            :aria-busy="detail.action === 'ascent:repeat'"
            :disabled="locked || !isActive(route)"
            @click="submitAscent(1)"
          >
            <Icon
              :name="detail.action === 'ascent:repeat' ? 'lucide:loader-circle' : 'lucide:repeat'"
              :class="{ 'animate-spin': detail.action === 'ascent:repeat' }"
              aria-hidden="true"
            />
            Repeat
          </button>
          <span
            class="min-w-16 text-right text-sm text-muted"
            role="status"
          ><strong class="text-lg text-text">{{ route.climbUser?.totalTries || 0 }}</strong> {{ route.climbUser?.totalTries === 1 ? 'try' : 'tries' }}</span>
        </div>

        <button
          v-if="topped"
          class="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-outline px-3 text-sm font-semibold transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          :aria-busy="detail.action === 'ascent:-1'"
          :disabled="locked"
          @click="unsend"
        >
          <Icon
            :name="detail.action === 'ascent:-1' ? 'lucide:loader-circle' : 'lucide:undo-2'"
            :class="{ 'animate-spin': detail.action === 'ascent:-1' }"
            aria-hidden="true"
          />
          Unsend
        </button>

        <template v-if="choices.length">
          <h2 class="mb-2 mt-5 text-sm font-semibold">
            Your grade
          </h2>
          <div
            class="grid grid-cols-5 gap-1.5"
            role="group"
            aria-label="Vote on the grade"
          >
            <button
              v-for="(grade, index) in choices"
              :key="index"
              class="flex min-h-12 items-center justify-center rounded-lg border px-1 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
              :class="[
                grade !== null && route.climbUser?.grade === grade ? 'border-accent bg-accent text-bg' : index === 2 ? 'border-accent' : 'border-outline',
              ]"
              :aria-pressed="grade !== null && route.climbUser?.grade === grade"
              :aria-busy="detail.action === `grade:${grade}`"
              :disabled="grade === null || locked || route.climbUser?.grade === grade"
              @click="grade !== null && voteGrade(grade)"
            >
              <Icon
                v-if="detail.action === `grade:${grade}`"
                name="lucide:loader-circle"
                class="animate-spin"
                aria-hidden="true"
              />
              <template v-else>
                {{ grade === null ? '—' : frenchGrade(grade) }}
              </template>
            </button>
          </div>
        </template>

        <p
          v-if="detail.actionError"
          class="mt-3 text-sm text-error"
          role="alert"
        >
          {{ detail.actionError }}
        </p>
      </div>

      <div class="mt-3 rounded-xl border border-outline/50 bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">
            Your log
          </h2>
          <Icon
            v-if="detail.loading"
            name="lucide:loader-circle"
            class="animate-spin text-muted"
            aria-label="Loading your log"
          />
        </div>
        <p
          v-if="detail.logsFailed && !detail.loading"
          class="text-sm text-error"
          role="alert"
        >
          Could not load your log. <button
            class="underline"
            @click="openRoute(id)"
          >
            Retry
          </button>
        </p>
        <p
          v-else-if="detail.logs && !detail.logs.length"
          class="text-sm text-muted"
        >
          No logs yet.
        </p>
        <ul
          v-else-if="detail.logs"
          class="m-0 list-none p-0"
          aria-label="Your log"
        >
          <li
            v-for="log in detail.logs"
            :key="log.id"
            class="flex items-center gap-3 border-t border-outline/50 py-1.5 text-sm"
          >
            <span class="w-20 shrink-0 text-muted">{{ dayLabel(log.climbedAtDate) }}</span>
            <span class="min-w-0 flex-1 break-words">
              <strong :class="{ 'text-emerald-600 dark:text-emerald-400': log.topped }">{{ logKind(log) }}</strong>
              <span
                v-if="route.leadEnabled && !route.leadRequired && typeof log.lead === 'boolean'"
                class="text-muted"
              > · {{ log.lead ? 'Lead' : 'Toprope' }}</span>
            </span>
            <button
              class="flex min-h-11 items-center justify-center rounded-lg border border-outline px-3 text-xs font-semibold text-error transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
              :aria-label="`Delete ${logKind(log)} from ${dayLabel(log.climbedAtDate)}`"
              :aria-busy="detail.action === `log:${log.id}`"
              :disabled="locked"
              @click="deleteLog(log)"
            >
              <Icon
                v-if="detail.action === `log:${log.id}`"
                name="lucide:loader-circle"
                class="animate-spin"
                aria-hidden="true"
              />
              <template v-else>
                Delete
              </template>
            </button>
          </li>
        </ul>
      </div>

      <div class="mt-3 rounded-xl border border-outline/50 bg-surface p-4">
        <h2 class="mb-3 text-base font-semibold">
          Route
        </h2>
        <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div v-for="item in routeFacts" :key="item.label">
            <dt class="mb-0.5 text-xs text-muted">
              {{ item.label }}
            </dt>
            <dd class="m-0 break-words font-medium">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="mt-3 rounded-xl border border-outline/50 bg-surface p-4">
        <h2 class="mb-3 text-base font-semibold">
          Your ascents
        </h2>
        <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div v-for="item in ascentFacts" :key="item.label">
            <dt class="mb-0.5 text-xs text-muted">
              {{ item.label }}
            </dt>
            <dd class="m-0 break-words font-medium">
              {{ item.value }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="mt-3 rounded-xl border border-outline/50 bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold">
            Community
          </h2>
          <Icon
            v-if="detail.loading"
            name="lucide:loader-circle"
            class="animate-spin text-muted"
            aria-label="Loading community data"
          />
        </div>
        <p
          v-if="detail.communityFailed && !detail.loading"
          class="text-sm text-muted"
        >
          Community data is not available for this route right now.
        </p>
        <template v-if="community">
          <h3 class="text-sm font-semibold">
            Grade votes
          </h3>
          <template v-if="gradeVoteTotal">
            <p class="my-2 text-sm text-muted">
              <strong class="text-xl text-text">{{ mostVoted }}</strong> Most voted · {{ gradeVoteTotal }} {{ gradeVoteTotal === 1 ? 'vote' : 'votes' }}
            </p>
            <ul class="m-0 list-none p-0">
              <li
                v-for="vote in gradeVotes"
                :key="vote.grade"
                class="border-t border-outline/50 py-2"
              >
                <div class="mb-1 flex flex-wrap items-center gap-2 text-sm">
                  <strong>{{ frenchGrade(vote.grade) }}</strong>
                  <span
                    v-if="vote.grade === route.grade"
                    class="rounded bg-bg px-1.5 py-0.5 text-xs text-muted"
                  >Route grade</span>
                  <span
                    v-if="vote.grade === route.climbUser?.grade"
                    class="rounded bg-accent px-1.5 py-0.5 text-xs text-bg"
                  >Your vote</span>
                </div>
                <div class="flex items-center gap-2.5 text-xs tabular-nums">
                  <span
                    class="h-2.5 min-w-20 flex-1 overflow-hidden rounded bg-bg"
                    aria-hidden="true"
                  ><span
                    class="block h-full rounded"
                    :class="vote.grade === route.climbUser?.grade ? 'bg-accent' : 'bg-muted'"
                    :style="{ width: `${vote.count / gradeVoteTotal * 100}%` }"
                  /></span>
                  <span><strong>{{ vote.count }}</strong> {{ vote.count === 1 ? 'vote' : 'votes' }} <span class="text-muted">· {{ Math.round(vote.count / gradeVoteTotal * 100) }}%</span></span>
                </div>
              </li>
            </ul>
          </template>
          <p
            v-else
            class="text-sm text-muted"
          >
            No grade votes yet.
          </p>

          <h3 class="mt-4 text-sm font-semibold">
            Rating <span class="font-normal text-muted">{{ rating }}</span>
          </h3>
          <div
            v-for="vote in ratingVotes"
            :key="vote.stars"
            class="my-2 flex items-center gap-2.5 text-xs text-muted"
          >
            <span class="w-14">{{ vote.stars }} stars</span>
            <meter
              class="flex-1"
              :value="vote.count"
              :max="maxRating"
              :aria-label="`${vote.count} votes for ${vote.stars} stars`"
            />
            <span class="w-6 text-right tabular-nums">{{ vote.count }}</span>
          </div>

          <h3 class="mt-4 text-sm font-semibold">
            Toppers
          </h3>
          <p
            v-if="community.toppersUnavailable"
            class="text-sm text-muted"
          >
            TopLogger has not made the toppers list available.
          </p>
          <p
            v-else-if="!community.toppers.length"
            class="text-sm text-muted"
          >
            No public tops yet.
          </p>
          <ul
            v-else
            class="m-0 list-none p-0"
          >
            <li
              v-for="topper in community.toppers"
              :key="topper.id"
              class="flex flex-wrap items-center gap-2 border-t border-outline/50 py-2 text-sm"
            >
              <Icon
                name="lucide:check"
                class="text-accent"
                aria-hidden="true"
              />
              <span>{{ topper.user?.fullName || 'Anonymous climber' }}</span>
              <span class="ml-auto text-xs text-muted">{{ ascentLabel(topper.tickType) }}<template v-if="topper.grade"> · {{ frenchGrade(topper.grade) }}</template></span>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import TlTabs from '../components/TlTabs.vue'
import { useTopLogger } from '../useTopLogger'
import {
  ascentLabel, colorValue, dateLabel, dayLabel, frenchGrade, gradeChoices, isActive, isNewRoute, logKind, score,
} from '~/shell/toplogger/domain'

const router = useRouter()
const query = useRoute()
const { state, detail, openRoute, submitAscent, unsend, deleteLog, voteGrade } = useTopLogger()

const id = computed(() => String(query.query.id ?? ''))
const route = computed(() => detail.route)
const community = computed(() => detail.community)
const topped = computed(() => (route.value?.climbUser?.tickType ?? 0) > 0)
/** Buttons stay off while a write is running, the list is syncing, or TopLogger is disconnected. */
const locked = computed(() => !!detail.action || state.busy || state.needsConnect || typeof route.value?.leadEnabled !== 'boolean')
const choices = computed(() => route.value ? gradeChoices(route.value.grade) : [])

const routeFacts = computed(() => {
  const r = route.value
  if (!r) {
    return []
  }
  const setters = [...r.climbSetters.map(s => s.gymAdmin.name), ...(r.setterName ? [r.setterName] : [])].join(', ')
  return [
    { label: 'Wall', value: r.wall?.nameLoc || 'Unknown' },
    { label: 'Rope / label', value: r.label || '—' },
    { label: 'Hold color', value: r.holdColor?.nameLoc || 'Unknown' },
    { label: 'Setter', value: setters || 'Unknown' },
    { label: 'Set on', value: dateLabel(r.inAt) },
    { label: 'Leaving / removed', value: dateLabel(r.outAt || r.outPlannedAt) },
  ]
})

const ascentFacts = computed(() => {
  const cu = route.value?.climbUser
  return [
    { label: 'Attempts', value: String(cu?.totalTries || 0) },
    { label: 'Best ascent', value: ascentLabel(cu?.tickType) },
    { label: 'Your grade', value: frenchGrade(cu?.grade) },
    { label: 'Score', value: String(route.value ? score(route.value.grade, cu?.tickType || 0) ?? '—' : '—') },
    { label: 'First attempt', value: dateLabel(cu?.triedFirstAtDate) },
    { label: 'First top', value: dateLabel(cu?.tickedFirstAtDate) },
  ]
})

const gradeVotes = computed(() => [...(community.value?.gradeVoteStats ?? [])].filter(v => v.count > 0).sort((a, b) => a.grade - b.grade))
const gradeVoteTotal = computed(() => gradeVotes.value.reduce((total, v) => total + v.count, 0))
const mostVoted = computed(() => {
  const highest = Math.max(...gradeVotes.value.map(v => v.count), 0)
  return gradeVotes.value.filter(v => v.count === highest).map(v => frenchGrade(v.grade)).join(' / ')
})
const ratingVotes = computed(() => [...(community.value?.ratingVoteStats ?? [])].sort((a, b) => b.stars - a.stars))
const maxRating = computed(() => Math.max(...ratingVotes.value.map(v => v.count), 1))
const rating = computed(() => {
  const votes = ratingVotes.value
  const count = votes.reduce((sum, v) => sum + v.count, 0)
  return count ? `${(votes.reduce((sum, v) => sum + v.stars * v.count, 0) / count).toFixed(1)} / 5` : 'No ratings yet'
})

function back() {
  // Opened from the list: step back so scroll position and filters are exactly as left. Otherwise go to the list.
  if (window.history.state?.back) {
    router.back()
  }
  else {
    void router.push('/toplogger')
  }
}

onMounted(() => openRoute(id.value))
watch(id, value => openRoute(value))
</script>
