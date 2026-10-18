<template>
  <div class="mt-3 rounded-xl border border-outline/50 bg-bg p-4 text-center">
    <p class="text-sm text-muted">
      {{ finished ? 'Done' : current ? `${current.label}${current.passes > 1 ? ` · ${current.pass} of ${current.passes}` : ''}` : label }}
    </p>
    <p
      class="my-2 text-6xl font-semibold tabular-nums"
      :class="finished ? 'text-accent' : ''"
      aria-live="off"
    >
      {{ finished ? '0:00' : clock(remaining) }}
    </p>
    <p class="text-xs text-muted">
      {{ label }} · {{ clock(totalSeconds(steps)) }} in total
    </p>
    <div class="mt-3 flex gap-2">
      <button
        class="min-h-12 flex-1 rounded-xl bg-accent px-4 font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        @click="running ? pause() : start()"
      >
        {{ running ? 'Pause' : finished ? 'Again' : elapsed > 0 ? 'Resume' : 'Start' }}
      </button>
      <button
        class="min-h-12 rounded-xl border border-outline px-4 font-medium transition hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        :disabled="elapsed === 0 && !running"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildSteps, positionAt, totalSeconds, type Timer } from '../plan'

const props = defineProps<{ timer: Timer }>()

const steps = computed(() => buildSteps(props.timer))
const label = computed(() => props.timer.label)

const elapsed = ref(0)
const running = ref(false)
let startedAt = 0
let base = 0
let handle: ReturnType<typeof setInterval> | undefined

const position = computed(() => positionAt(steps.value, elapsed.value))
const finished = computed(() => position.value.done)
const current = computed(() => steps.value[position.value.index])
const remaining = computed(() => position.value.remaining || steps.value[0]?.seconds || 0)

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function tick() {
  elapsed.value = base + (Date.now() - startedAt)
  if (positionAt(steps.value, elapsed.value).done) {
    stop()
  }
}

function stop() {
  clearInterval(handle)
  handle = undefined
  running.value = false
}

function start() {
  if (finished.value) {
    elapsed.value = 0
  }
  base = elapsed.value
  startedAt = Date.now()
  running.value = true
  handle = setInterval(tick, 100)
}

function pause() {
  tick()
  stop()
}

function reset() {
  stop()
  elapsed.value = 0
}

onBeforeUnmount(stop)
</script>
