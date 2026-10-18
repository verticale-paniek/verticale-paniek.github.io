<template>
  <div
    class="mt-3 rounded-xl border p-4 text-center transition-colors"
    :class="panelClass"
  >
    <p class="text-lg font-semibold">
      {{ heading }}
    </p>
    <p
      class="my-2 text-7xl font-bold tabular-nums"
      aria-live="off"
    >
      {{ finished ? '0:00' : clock(remaining) }}
    </p>
    <p
      v-if="sub"
      class="text-base font-medium"
    >
      {{ sub }}
    </p>
    <p
      class="text-xs"
      :class="active ? 'text-white/80' : 'text-muted'"
    >
      {{ label }} · {{ clock(totalSeconds(steps)) }} in total
    </p>
    <div class="mt-3 flex gap-2">
      <button
        class="min-h-12 flex-1 rounded-xl px-4 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :class="active ? 'bg-white/90 text-black' : 'bg-accent text-white'"
        @click="running ? pause() : start()"
      >
        {{ running ? 'Pause' : finished ? 'Again' : elapsed > 0 ? 'Resume' : 'Start' }}
      </button>
      <button
        class="min-h-12 rounded-xl border px-4 font-medium transition focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
        :class="active ? 'border-white/60 hover:bg-white/10' : 'border-outline hover:bg-text/5'"
        :disabled="elapsed === 0 && !running"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildSteps, cueFor, positionAt, totalSeconds, type Position, type Timer } from '../plan'
import { holdScreen, prepareAudio, releaseScreen, signal } from '../utils/feedback'

/** Present when the timer is one exercise of a chain, where the exercises follow each other by themselves. */
export interface Chain {
  /** Exercise name, shown as the title during its work. */
  title: string
  /** "3 of 10". */
  position: string
  /** Name of the next exercise, shown during the rest; null for the last. */
  next: string | null
  last: boolean
  /** Started by the chain (no lead-in, no long start beep) rather than by a tap. */
  auto: boolean
}

const props = defineProps<{ timer: Timer, chain?: Chain }>()
const emit = defineEmits<{ finished: [] }>()

const steps = computed(() => buildSteps(props.timer, { leadIn: !props.chain?.auto, keepRest: !!props.chain && !props.chain.last }))
const label = computed(() => props.timer.label)

const elapsed = ref(0)
const running = ref(false)
let startedAt = 0
let base = 0
let handle: ReturnType<typeof setInterval> | undefined

const position = computed(() => positionAt(steps.value, elapsed.value))
const finished = computed(() => position.value.done)
const current = computed(() => steps.value[position.value.index])
/** True while a timer is under way (running or paused mid-way): the panel takes the colour of the current phase. */
const active = computed(() => (running.value || elapsed.value > 0) && !finished.value)
const panelClass = computed(() => {
  if (!active.value) {
    return 'border-outline/50 bg-bg'
  }
  const kind = current.value?.kind
  return kind === 'work' ? 'border-transparent bg-green-600 text-white' : kind === 'rest' ? 'border-transparent bg-blue-600 text-white' : 'border-transparent bg-orange-500 text-white'
})
const heading = computed(() => {
  if (finished.value) {
    return 'Done'
  }
  if (!current.value || !active.value) {
    return label.value
  }
  if (props.chain && current.value.kind === 'work') {
    return props.chain.title
  }
  return current.value.passes > 1 && current.value.kind !== 'ready' ? `${current.value.label} · ${current.value.pass} of ${current.value.passes}` : current.value.label
})
/** In a chain: where we are, and during the rest what comes next. */
const sub = computed(() => {
  if (!props.chain || !active.value || finished.value) {
    return ''
  }
  return current.value?.kind !== 'work' && props.chain.next ? `Next: ${props.chain.next}` : props.chain.position
})
const remaining = computed(() => position.value.remaining || steps.value[0]?.seconds || 0)

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Where the timer was at the previous tick, to tell when a cue is due. Null before the first tick of a run. */
let last: Position | null = null

function tick() {
  elapsed.value = base + (Date.now() - startedAt)
  const next = positionAt(steps.value, elapsed.value)
  const cue = cueFor(last, next)
  // The end of a chained exercise is not an ending: the next one starts with its own beep.
  if (cue && !(cue === 'done' && props.chain && !props.chain.last)) {
    signal(cue)
  }
  last = next
  if (next.done) {
    stop()
    emit('finished')
  }
}

function stop() {
  clearInterval(handle)
  handle = undefined
  running.value = false
  void releaseScreen()
}

/** A phone that returns to the app mid-timer gives the screen lock back. */
function onVisible() {
  if (running.value && document.visibilityState === 'visible') {
    void holdScreen()
  }
}

function start() {
  if (finished.value) {
    elapsed.value = 0
  }
  base = elapsed.value
  startedAt = Date.now()
  last = positionAt(steps.value, elapsed.value)
  running.value = true
  prepareAudio()
  void holdScreen()
  if (base === 0) {
    signal(props.chain?.auto ? 'phase' : 'start') // a long beep to get everyone's attention; resuming a pause stays quiet
  }
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

onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
  if (props.chain?.auto) {
    start()
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisible)
  stop()
})
</script>
