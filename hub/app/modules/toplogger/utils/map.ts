import type { Route } from '~/shell/toplogger/domain'
import { colorValue } from '~/shell/toplogger/domain'

export function markerTextColor(color?: string): string {
  let hex = colorValue(color).slice(1)
  if (hex.length === 3) {
    hex = [...hex].map(c => c + c).join('')
  }
  const [r, g, b] = [0, 2, 4].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.179 ? '#111111' : '#ffffff'
}

export function floorplanUrl(path?: string | null): string | null {
  return path && /^gyms\/[\w-]+\/floorplans\/[\w.-]+\.svg$/.test(path)
    ? `https://uploads.toplogger.nu/${path}`
    : null
}

export function hasPosition(route: Route): route is Route & { positionX: number, positionY: number } {
  return typeof route.positionX === 'number' && Number.isFinite(route.positionX)
    && typeof route.positionY === 'number' && Number.isFinite(route.positionY)
}

export interface MapRect { x: number, y: number, width: number, height: number }

/** TopLogger normalizes by drawing size, without subtracting its origin. Values can exceed 1. */
export function mapMarkers(routes: Route[], drawing: MapRect) {
  const groups = new Map<string, { x: number, y: number, routes: Route[] }>()
  for (const route of routes.filter(hasPosition)) {
    const key = `${route.positionX},${route.positionY}`
    const group = groups.get(key) ?? { x: route.positionX * drawing.width, y: route.positionY * drawing.height, routes: [] }
    group.routes.push(route)
    groups.set(key, group)
  }
  return [...groups.entries()].map(([id, marker]) => ({ id, ...marker }))
}

/** Only inert SVG geometry enters the measuring DOM; the visible drawing is an image. */
export function readDrawing(source: string): { url: string, rect: MapRect } {
  const documentSvg = new DOMParser().parseFromString(source, 'image/svg+xml')
  const layer = documentSvg.querySelector('#zoom_layer')
  if (documentSvg.querySelector('parsererror') || !layer) {
    throw new Error('Invalid floorplan')
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const tags = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan'])
  const attributes = new Set(['d', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'dx', 'dy', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor'])
  function copy(from: Element, to: Element) {
    for (const node of from.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(node.textContent ?? ''))
      }
      else if (node instanceof Element && tags.has(node.localName)) {
        const child = document.createElementNS(svg.namespaceURI, node.localName)
        for (const attr of node.attributes) {
          if (attributes.has(attr.name) && !/url\s*\(|[<>\\]/i.test(attr.value)) {
            child.setAttribute(attr.name, attr.value)
          }
        }
        copy(node, child)
        to.appendChild(child)
      }
    }
  }
  copy(layer, svg)
  svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  document.body.appendChild(svg)
  try {
    const { x, y, width, height } = svg.getBBox()
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      throw new Error('Empty floorplan')
    }
    svg.removeAttribute('style')
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }))
    return { url, rect: { x, y, width, height } }
  }
  finally {
    svg.remove()
  }
}
