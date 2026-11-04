import { describe, expect, it } from 'vitest'
import type { Route } from '~/shell/toplogger/domain'
import { floorplanUrl, hasPosition, mapMarkers } from '~/modules/toplogger/utils/map'

describe('gym map', () => {
  it('only loads floorplans from the TopLogger uploads host', () => {
    expect(floorplanUrl('gyms/klimax/floorplans/3-example.svg')).toBe('https://uploads.toplogger.nu/gyms/klimax/floorplans/3-example.svg')
    for (const path of [null, undefined, '', 'https://evil.test/map.svg', '//evil.test/map.svg', 'gyms/../floorplans/map.svg', 'gyms/g/floorplans/map.svg?x=1']) {
      expect(floorplanUrl(path)).toBeNull()
    }
  })

  it('keeps zero and coordinates above one, but excludes missing or invalid positions', () => {
    for (const position of [{ positionX: 0, positionY: 1.3 }, { positionX: -0.1, positionY: 0 }]) {
      expect(hasPosition(position as Route)).toBe(true)
    }
    for (const position of [{}, { positionX: null, positionY: 1 }, { positionX: 1, positionY: NaN }, { positionX: Infinity, positionY: 1 }]) {
      expect(hasPosition(position as Route)).toBe(false)
    }
  })

  it('scales by drawing size without adding the origin, grouping routes at the same rope', () => {
    const routes = [
      { id: 'a', positionX: 0.4, positionY: 1.3 },
      { id: 'b', positionX: 0.4, positionY: 1.3 },
      { id: 'c', positionX: 0, positionY: 0 },
      { id: 'unplaced' },
    ] as Route[]
    const markers = mapMarkers(routes, { x: 200, y: 1000, width: 1500, height: 900 })
    expect(markers).toHaveLength(2)
    expect(markers[0]).toMatchObject({ x: 600, y: 1170, routes: [routes[0], routes[1]] })
    expect(markers[1]).toMatchObject({ x: 0, y: 0 })
  })

  it('groups nearby routes by rope within their wall, centered on their positions', () => {
    const routes = [
      { id: 'a', label: '4', wall: { nameLoc: 'Sector 1' }, positionX: 0.4, positionY: 0.5 },
      { id: 'b', label: '4', wall: { nameLoc: 'Sector 1' }, positionX: 0.6, positionY: 0.7 },
      { id: 'c', label: '4', wall: { nameLoc: 'Sector 2' }, positionX: 0.4, positionY: 0.5 },
      { id: 'unplaced', label: '4', wall: { nameLoc: 'Sector 1' } },
    ] as Route[]
    const markers = mapMarkers(routes, { x: 0, y: 0, width: 1000, height: 1000 })
    expect(markers).toHaveLength(2)
    expect(markers[0]).toMatchObject({ x: 500, y: 600, routes: routes.slice(0, 2) })
    expect(markers[1]).toMatchObject({ x: 400, y: 500, routes: [routes[2]] })
  })
})
