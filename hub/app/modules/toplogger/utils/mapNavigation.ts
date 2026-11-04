import { reactive } from 'vue'

interface Point { x: number, y: number }

/** Screen-space pan/zoom; keeping the anchor fixed makes wheel and pinch zoom feel natural. */
export function mapNavigation() {
  const view = reactive({ x: 0, y: 0, scale: 1, moved: false, dragging: false })
  const pointers = new Map<number, Point>()
  let start: Point = { x: 0, y: 0 }
  let minimum = 0.1
  let maximum = 10

  function zoom(factor: number, anchor: Point, destination = anchor) {
    const scale = Math.max(minimum, Math.min(maximum, view.scale * factor))
    const ratio = scale / view.scale
    view.x = destination.x - (anchor.x - view.x) * ratio
    view.y = destination.y - (anchor.y - view.y) * ratio
    view.scale = scale
  }

  function fit(rect: { x: number, y: number, width: number, height: number }, width: number, height: number) {
    if (width <= 0 || height <= 0) {
      return
    }
    const scale = Math.min(width / rect.width, height / rect.height)
    minimum = scale / 2
    maximum = scale * 16
    Object.assign(view, { scale, x: (width - rect.width * scale) / 2 - rect.x * scale, y: (height - rect.height * scale) / 2 - rect.y * scale })
  }

  function down(id: number, point: Point) {
    if (!pointers.size) {
      start = point
      view.moved = false
    }
    pointers.set(id, point)
    view.dragging = true
    if (pointers.size > 1) {
      view.moved = true
    }
  }

  function move(id: number, point: Point) {
    const previous = pointers.get(id)
    if (!previous) {
      return
    }
    const before = [...pointers.values()]
    pointers.set(id, point)
    const after = [...pointers.values()]
    if (before.length >= 2) {
      const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
      const oldDistance = distance(before[0]!, before[1]!)
      if (oldDistance > 0) {
        zoom(distance(after[0]!, after[1]!) / oldDistance, midpoint(before[0]!, before[1]!), midpoint(after[0]!, after[1]!))
      }
    }
    else {
      if (!view.moved && Math.hypot(point.x - start.x, point.y - start.y) < 6) {
        return
      }
      const origin = view.moved ? previous : start
      view.moved = true
      view.x += point.x - origin.x
      view.y += point.y - origin.y
    }
  }

  function up(id: number) {
    pointers.delete(id)
    view.dragging = pointers.size > 0
  }

  return { view, fit, zoom, down, move, up }
}
