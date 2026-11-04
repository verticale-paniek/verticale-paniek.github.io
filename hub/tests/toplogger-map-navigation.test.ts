import { describe, expect, it } from 'vitest'
import { mapNavigation } from '~/modules/toplogger/utils/mapNavigation'
import { markerTextColor } from '~/modules/toplogger/utils/map'

describe('map navigation', () => {
  it('keeps the camera across leaving and returning, even if logging changes the visible routes', () => {
    const map = mapNavigation()
    const frame = { x: 100, y: 200, width: 400, height: 200 }
    map.resize(frame, 400, 400)
    map.zoom(3, { x: 180, y: 190 })
    map.down(1, { x: 100, y: 100 })
    map.move(1, { x: 160, y: 130 })
    const camera = { x: map.view.x, y: map.view.y, scale: map.view.scale }
    map.release()
    map.resize(frame, 0, 0)
    map.resize({ x: 300, y: 400, width: 100, height: 100 }, 400, 400)
    expect(map.view).toMatchObject({ ...camera, moved: false, dragging: false })
    map.move(1, { x: 200, y: 200 })
    expect(map.view).toMatchObject(camera)
    map.fit(frame, 400, 400)
    expect(map.view).toMatchObject({ x: -100, y: -100, scale: 1 })
  })

  it('keeps the map center and zoom when the viewport size changes', () => {
    const map = mapNavigation()
    const frame = { x: 0, y: 0, width: 400, height: 400 }
    map.resize(frame, 400, 400)
    map.zoom(2, { x: 200, y: 200 })
    const center = { x: (200 - map.view.x) / map.view.scale, y: (200 - map.view.y) / map.view.scale }
    map.resize(frame, 600, 300)
    expect(map.view.scale).toBe(2)
    expect((300 - map.view.x) / map.view.scale).toBe(center.x)
    expect((150 - map.view.y) / map.view.scale).toBe(center.y)
  })

  it('fits a non-zero map origin and keeps the wheel anchor fixed', () => {
    const map = mapNavigation()
    map.fit({ x: 100, y: 200, width: 400, height: 200 }, 400, 400)
    expect(map.view).toMatchObject({ x: -100, y: -100, scale: 1 })
    map.zoom(2, { x: 200, y: 200 })
    expect(map.view).toMatchObject({ x: -400, y: -400, scale: 2 })
    expect(300 * map.view.scale + map.view.x).toBe(200)
  })

  it('allows taps with slight finger movement and suppresses clicks after dragging', () => {
    const map = mapNavigation()
    map.down(1, { x: 100, y: 100 })
    map.move(1, { x: 102, y: 102 })
    map.up(1)
    expect(map.view).toMatchObject({ x: 0, y: 0, moved: false, dragging: false })
    map.down(1, { x: 100, y: 100 })
    map.move(1, { x: 130, y: 120 })
    map.up(1)
    expect(map.view).toMatchObject({ x: 30, y: 20, moved: true, dragging: false })
    map.down(2, { x: 100, y: 100 })
    expect(map.view.moved).toBe(false)
  })

  it('pinches around the midpoint and continues panning after lifting one finger', () => {
    const map = mapNavigation()
    map.down(1, { x: 0, y: 100 })
    map.down(2, { x: 100, y: 100 })
    map.move(2, { x: 200, y: 100 })
    expect(map.view).toMatchObject({ x: 0, y: -100, scale: 2, moved: true })
    map.up(2)
    map.move(1, { x: 10, y: 120 })
    expect(map.view).toMatchObject({ x: 10, y: -80, scale: 2 })
    map.up(1)
    expect(map.view.dragging).toBe(false)
  })

  it('limits zoom and ignores moves from released pointers', () => {
    const map = mapNavigation()
    map.fit({ x: 0, y: 0, width: 400, height: 400 }, 400, 400)
    map.zoom(1000, { x: 0, y: 0 })
    expect(map.view.scale).toBe(16)
    map.zoom(0.00001, { x: 0, y: 0 })
    expect(map.view.scale).toBe(0.5)
    map.move(999, { x: 100, y: 100 })
    expect(map.view.x).toBe(0)
  })
})

it('uses readable text on dark and light hold colors', () => {
  expect(markerTextColor('#000')).toBe('#ffffff')
  expect(markerTextColor('#222222')).toBe('#ffffff')
  expect(markerTextColor('#fff')).toBe('#111111')
  expect(markerTextColor('#ffff00')).toBe('#111111')
})
