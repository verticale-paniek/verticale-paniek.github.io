<template>
  <div>
    <p v-if="!sourceUrl || error" class="my-3 text-sm text-muted" role="status">
      {{ error || (floorplanPath === undefined ? 'Map data has not loaded yet. Refresh routes and try again.' : 'No floorplan is available for this gym. Routes are listed below.') }}
      <button v-if="error" class="min-h-11 px-2 text-accent underline" @click="loadDrawing">
        Retry map
      </button>
    </p>
    <p v-else-if="!drawing" class="py-6 text-center text-muted" role="status">
      Loading gym map…
    </p>
    <template v-if="drawing">
      <div class="mb-2 flex items-center gap-2">
        <p class="flex-1 text-xs text-muted">
          Tap a marker to see routes. ✓ = done. Scroll to move around.
        </p>
        <button class="size-11 rounded-lg border border-outline disabled:opacity-40" aria-label="Zoom out" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - 0.5)">
          −
        </button>
        <button class="size-11 rounded-lg border border-outline disabled:opacity-40" aria-label="Zoom in" :disabled="zoom >= 4" @click="zoom = Math.min(4, zoom + 0.5)">
          +
        </button>
      </div>
      <div class="max-h-[65vh] overflow-auto rounded-xl border border-outline bg-white" tabindex="0" aria-label="Gym map; scroll to pan">
        <div class="relative overflow-hidden" :style="{ width: `${zoom * 100}%`, minWidth: `${360 * frame.width / frame.height * zoom}px`, aspectRatio: `${frame.width} / ${frame.height}` }">
          <img
            :src="drawing.url"
            alt="Gym floorplan from TopLogger"
            class="pointer-events-none absolute max-w-none"
            :style="{ left: `${(drawing.rect.x - frame.x) / frame.width * 100}%`, top: `${(drawing.rect.y - frame.y) / frame.height * 100}%`, width: `${drawing.rect.width / frame.width * 100}%`, height: `${drawing.rect.height / frame.height * 100}%` }"
          >
          <button
            v-for="marker in markers"
            :key="marker.id"
            class="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-xs font-bold text-slate-950 shadow focus-visible:outline-4 focus-visible:outline-blue-600"
            :class="{ 'ring-4 ring-blue-600': selected === marker.id }"
            :style="{ left: `${(marker.x - frame.x) / frame.width * 100}%`, top: `${(marker.y - frame.y) / frame.height * 100}%`, borderColor: colorValue(marker.routes[0]?.holdColor?.color) }"
            :aria-label="marker.routes.map(r => `${r.name || r.label || 'Route'}, ${frenchGrade(r.grade)}, ${r.holdColor?.nameLoc || 'unknown color'}, ${r.climbUser?.tickType ? 'done' : 'to do'}`).join('; ')"
            :aria-pressed="selected === marker.id"
            @click="selected = selected === marker.id ? '' : marker.id"
          >
            {{ marker.routes[0]?.label || frenchGrade(marker.routes[0]?.grade) }}
            <span v-if="marker.routes.length > 1" class="absolute -right-1 -top-2 rounded-full bg-slate-800 px-1 text-white">{{ marker.routes.length }}</span>
            <span v-if="marker.routes.every(r => r.climbUser?.tickType)" class="absolute -bottom-2 rounded-full bg-emerald-700 px-1 text-white">✓</span>
          </button>
        </div>
      </div>
      <ul v-if="selectedRoutes.length" class="m-0 list-none p-0" aria-label="Selected map routes">
        <RouteCard v-for="route in selectedRoutes" :key="route.id" :route="route" />
      </ul>
      <p v-if="unplaced.length" class="mt-4 text-sm text-muted">
        {{ unplaced.length }} routes have no map position:
      </p>
    </template>
    <ul class="m-0 list-none p-0">
      <RouteCard v-for="route in drawing ? unplaced : routes" :key="route.id" :route="route" />
    </ul>
  </div>
</template>

<script setup lang="ts">
import RouteCard from './RouteCard.vue'
import { colorValue, frenchGrade, type Route } from '~/shell/toplogger/domain'
import { floorplanUrl, hasPosition, mapMarkers, readDrawing } from '../utils/map'

const props = defineProps<{ floorplanPath?: string | null, routes: Route[] }>()
const sourceUrl = computed(() => floorplanUrl(props.floorplanPath))
const drawing = shallowRef<ReturnType<typeof readDrawing> | null>(null)
const error = ref('')
const zoom = ref(1)
const selected = ref('')
const markers = computed(() => drawing.value ? mapMarkers(props.routes, drawing.value.rect) : [])
const unplaced = computed(() => props.routes.filter(route => !hasPosition(route)))
const selectedRoutes = computed(() => markers.value.find(marker => marker.id === selected.value)?.routes ?? [])
const frame = computed(() => {
  if (!markers.value.length) {
    return drawing.value?.rect ?? { x: 0, y: 0, width: 1, height: 1 }
  }
  const xs = markers.value.map(m => m.x)
  const ys = markers.value.map(m => m.y)
  const x = Math.min(...xs) - 100
  const y = Math.min(...ys) - 100
  return { x, y, width: Math.max(...xs) + 100 - x, height: Math.max(...ys) + 100 - y }
})
let controller: AbortController | undefined
function clearDrawing() {
  if (drawing.value) {
    URL.revokeObjectURL(drawing.value.url)
  }
  drawing.value = null
}
async function loadDrawing() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  clearDrawing()
  error.value = ''
  zoom.value = 1
  selected.value = ''
  if (!sourceUrl.value) {
    return
  }
  try {
    const response = await fetch(sourceUrl.value, { signal: AbortSignal.any([current.signal, AbortSignal.timeout(15000)]), credentials: 'omit' })
    if (!response.ok) {
      throw new Error('Map unavailable')
    }
    const source = await response.text()
    if (!current.signal.aborted) {
      drawing.value = readDrawing(source)
    }
  }
  catch {
    if (!current.signal.aborted) {
      error.value = 'The gym map could not be loaded. Routes are listed below.'
    }
  }
}
watch(sourceUrl, loadDrawing, { immediate: true })
onBeforeUnmount(() => {
  controller?.abort()
  clearDrawing()
})
</script>
