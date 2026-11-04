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
      <div class="mb-2 flex items-center gap-2 rounded-xl border border-outline/50 bg-surface p-2">
        <p class="min-w-0 flex-1 px-1 text-sm font-semibold">
          Select a marker
        </p>
        <details class="relative shrink-0 text-sm text-muted">
          <summary class="grid size-11 cursor-pointer list-none place-items-center rounded-lg hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden" aria-label="Map help">
            ?
          </summary>
          <p class="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-outline bg-surface p-3 leading-relaxed shadow-lg">
            Numbers identify ropes. Blue groups contain nearby ropes: select a group to browse its routes, or zoom in to separate them. Drag to move; pinch or scroll to zoom. Keyboard: arrow keys pan, +/− zoom, Home fits the map.
          </p>
        </details>
        <button class="size-11 shrink-0 rounded-lg border border-outline text-lg hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent" aria-label="Zoom out" @click="zoomAtCenter(1 / 1.4)">
          −
        </button>
        <button class="size-11 shrink-0 rounded-lg border border-outline text-lg hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent" aria-label="Zoom in" @click="zoomAtCenter(1.4)">
          +
        </button>
        <button class="min-h-11 shrink-0 rounded-lg border border-outline px-3 text-sm hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent" @click="fit">
          Fit
        </button>
      </div>
      <div
        ref="viewport"
        class="relative h-[calc(100dvh-32rem)] min-h-64 max-h-[600px] touch-none select-none overflow-hidden rounded-xl border border-outline bg-white focus-visible:outline-2 focus-visible:outline-accent"
        :class="view.dragging ? 'cursor-grabbing' : 'cursor-grab'"
        tabindex="0"
        role="region"
        aria-label="Gym map. Drag to pan, pinch or scroll to zoom. Arrow keys pan; plus and minus zoom; Home fits the map."
        @pointerdown="pointerDown"
        @pointermove="navigation.move($event.pointerId, point($event))"
        @pointerup="navigation.up($event.pointerId)"
        @pointercancel="navigation.up($event.pointerId)"
        @lostpointercapture="navigation.up($event.pointerId)"
        @wheel.prevent="wheel"
        @click.capture="guardClick"
        @keydown="keyDown"
      >
        <img
          v-if="drawing"
          :src="drawing.url"
          alt="Gym floorplan from TopLogger"
          class="pointer-events-none absolute max-w-none"
          draggable="false"
          :style="{ left: `${view.x + drawing.rect.x * view.scale}px`, top: `${view.y + drawing.rect.y * view.scale}px`, width: `${drawing.rect.width * view.scale}px`, height: `${drawing.rect.height * view.scale}px` }"
        >
        <template v-for="marker in markers" :key="marker.id">
          <PopoverRoot v-if="marker.routes.length > 1">
            <PopoverTrigger
              class="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-white text-white shadow-sm focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-blue-600"
              :class="marker.ropes > 1 ? 'bg-blue-700' : 'bg-zinc-900'"
              :style="{ left: `${view.x + marker.x * view.scale}px`, top: `${view.y + marker.y * view.scale}px` }"
              :aria-label="`${marker.ropes > 1 ? `${marker.ropes} nearby ropes` : marker.route.label ? `Rope ${marker.route.label}` : 'Position'}, ${marker.routes.length} routes`"
            >
              <span class="text-base font-semibold leading-5">{{ marker.ropes > 1 ? marker.ropes : marker.route.label || '•' }}</span>
              <span class="text-[10px] leading-3">{{ marker.ropes > 1 ? 'ropes' : `${marker.routes.length} routes` }}</span>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent side="top" :side-offset="12" :collision-padding="16" class="z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-outline bg-bg p-3 text-text shadow-xl" :aria-label="marker.ropes > 1 ? 'Routes at nearby ropes' : `Routes at ${marker.route.label ? `rope ${marker.route.label}` : 'this position'}`">
                <div class="flex items-center gap-2 border-b border-outline/50 pb-2">
                  <div class="flex-1">
                    <h2 class="text-base font-semibold">
                      {{ marker.ropes > 1 ? `${marker.ropes} nearby ropes` : marker.route.label ? `Rope ${marker.route.label}` : 'Routes at this position' }}
                    </h2>
                    <p class="text-xs text-muted">
                      {{ marker.routes.length }} routes · Select for details
                    </p>
                  </div>
                  <PopoverClose class="grid size-11 place-items-center rounded-lg hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent" aria-label="Close route picker">
                    <Icon name="lucide:x" aria-hidden="true" />
                  </PopoverClose>
                </div>
                <ul class="m-0 max-h-[45dvh] list-none overflow-y-auto overscroll-contain p-0">
                  <RouteCard v-for="route in marker.routes" :key="route.id" :route="route" />
                </ul>
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
          <NuxtLink
            v-else
            :to="{ path: '/toplogger/route', query: { id: marker.route.id } }"
            class="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-white bg-zinc-900 text-white shadow-sm focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-blue-600"
            :style="{ left: `${view.x + marker.x * view.scale}px`, top: `${view.y + marker.y * view.scale}px` }"
            :aria-label="`${marker.route.name || marker.route.label || 'Route'}, ${frenchGrade(marker.route.grade)}, ${marker.route.holdColor?.nameLoc || 'unknown color'}, ${ascentLabel(marker.route.climbUser?.tickType)}`"
            draggable="false"
            @dragstart.prevent
          >
            <span class="text-base font-semibold leading-5">{{ marker.route.label || frenchGrade(marker.route.grade) }}</span>
            <span class="text-[10px] leading-3">{{ marker.route.label ? frenchGrade(marker.route.grade) : 'Route' }}</span>
          </NuxtLink>
        </template>
      </div>
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
import { ascentLabel, frenchGrade, type Route } from '~/shell/toplogger/domain'
import { clusterMarkers, floorplanUrl, hasPosition, mapMarkers, readDrawing } from '../utils/map'
import { toploggerCall } from '~/shell/toplogger/api'
import type { mapNavigation } from '../utils/mapNavigation'

const props = defineProps<{ floorplanPath?: string | null, routes: Route[], navigation: ReturnType<typeof mapNavigation> }>()
const supabase = useSupabase()
const sourceUrl = computed(() => floorplanUrl(props.floorplanPath))
const drawing = shallowRef<ReturnType<typeof readDrawing> | null>(null)
const error = ref('')
const viewport = useTemplateRef('viewport')
const { width, height } = useElementSize(viewport)
const navigation = props.navigation
const { view } = navigation
const positions = computed(() => drawing.value ? mapMarkers(props.routes, drawing.value.rect) : [])
const markers = computed(() => clusterMarkers(positions.value, view.scale).map((group) => {
  const routes = group.markers.flatMap(marker => marker.routes).sort((a, b) => a.grade - b.grade)
  return { id: group.markers.map(marker => marker.id).join('|'), x: group.x, y: group.y, ropes: group.markers.length, routes, route: routes[0]! }
}))
const unplaced = computed(() => props.routes.filter(route => !hasPosition(route)))
const frame = computed(() => {
  if (!positions.value.length) {
    return drawing.value?.rect ?? { x: 0, y: 0, width: 1, height: 1 }
  }
  const xs = positions.value.map(m => m.x)
  const ys = positions.value.map(m => m.y)
  const x = Math.min(...xs) - 100
  const y = Math.min(...ys) - 100
  return { x, y, width: Math.max(...xs) + 100 - x, height: Math.max(...ys) + 100 - y }
})
function fit() {
  navigation.fit(frame.value, width.value, height.value)
}
watch(() => [width.value, height.value, frame.value.x, frame.value.y, frame.value.width, frame.value.height], () => {
  if (drawing.value) {
    navigation.resize(frame.value, width.value, height.value)
  }
})
function point(event: { clientX: number, clientY: number }) {
  const rect = viewport.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }
  const target = (event.target as Element).closest('a, button') ?? viewport.value!
  target.setPointerCapture(event.pointerId)
  navigation.down(event.pointerId, point(event))
}
function guardClick(event: MouseEvent) {
  if (view.moved && event.detail !== 0) {
    event.preventDefault()
    event.stopPropagation()
  }
}
function zoomAtCenter(factor: number) {
  navigation.zoom(factor, { x: width.value / 2, y: height.value / 2 })
}
function wheel(event: WheelEvent) {
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height.value : 1)
  navigation.zoom(Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.002), point(event))
}
function keyDown(event: KeyboardEvent) {
  if (event.target !== viewport.value) {
    return
  }
  switch (event.key) {
    case 'ArrowLeft':
      view.x += 40
      break
    case 'ArrowRight':
      view.x -= 40
      break
    case 'ArrowUp':
      view.y += 40
      break
    case 'ArrowDown':
      view.y -= 40
      break
    case '+': case '=':
      zoomAtCenter(1.4)
      break
    case '-':
      zoomAtCenter(1 / 1.4)
      break
    case 'Home':
      fit()
      break
    default: return
  }
  event.preventDefault()
}
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
  if (!sourceUrl.value) {
    return
  }
  try {
    const { svg } = await toploggerCall<{ svg: string }>(supabase, { action: 'floorplan', path: props.floorplanPath! })
    if (!current.signal.aborted) {
      drawing.value = readDrawing(svg)
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
  navigation.release()
  controller?.abort()
  clearDrawing()
})
</script>
