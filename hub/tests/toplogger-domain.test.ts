import { describe, expect, it } from 'vitest'
import {
  averageLabel, colorValue, dayLabel, daysLeft, daysLeftLabel, defaultWallSelection, frenchGrade, gradeChoices, isActive,
  logKind, score, topCount, topTen, visibleLogs,
  type Ascent, type Route, type RouteLog,
} from '~/shell/toplogger/domain'

const route = (id: string, grade = 600, outAt: string | null = null): Route => ({ id, grade, outAt, name: null, label: '1', wall: null, holdColor: null, setterName: null, climbSetters: [], inAt: null, outPlannedAt: null, climbUser: null })
const log = (climbId: string, tickType = 1, climbedAtDate = '2026-09-20', gymId = 'gym'): Ascent => ({ id: `${climbId}-${climbedAtDate}`, gymId, climbId, climbType: 'route', tickType, climbedAtDate, valid: true, ticked: true, topped: true })
const routeLog = (id: string, climbedAtDate: string, extra: Partial<RouteLog> = {}): RouteLog => ({ id, gymId: 'gym', climbId: 'r', climbedAtDate, valid: true, topped: true, ticked: true, tickType: 1, tickIndex: 0, tryIndex: 0, lead: false, autoAdded: false, ...extra })
const now = new Date('2026-09-28T12:00:00')

describe('grades', () => {
  it('keeps the route grade centered across number boundaries and scale limits', () => {
    expect(gradeChoices(633)).toEqual([600, 617, 633, 650, 667])
    expect(gradeChoices(700)).toEqual([667, 683, 700, 717, 733])
    expect(gradeChoices(467)).toEqual([400, 433, 467, 500, 517])
    expect(gradeChoices(200)).toEqual([null, null, 200, 300, 333])
    expect(gradeChoices(950)).toEqual([917, 933, 950, null, null])
    expect(gradeChoices(0)).toEqual([])
    expect(gradeChoices(633).map(g => frenchGrade(g))).toEqual(['6a', '6a+', '6b', '6b+', '6c'])
    expect(frenchGrade(433)).toBe('4b')
  })

  it('labels French grades, scores bonuses and distrusts colors', () => {
    expect([0, 600, 608, 609, 624, 625, 641, 642, 658, 659, 674, 675, 683].map(frenchGrade))
      .toEqual(['?', '6a', '6a', '6a+', '6a+', '6b', '6b', '6b+', '6b+', '6c', '6c', '6c+', '6c+'])
    expect([0, 1, 2, 3, 4].map(type => score(600, type))).toEqual([null, 600, 610, 615, null])
    expect(averageLabel([])).toBe('—')
    expect(colorValue('url(https://example.com)')).toBe('#888888')
  })
})

describe('walls and routes', () => {
  it('defaults Klimax to sectors 1–7 and other gyms to all walls', () => {
    const walls = ['Sector 1', 'sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 6', 'Sector 7', 'Sector 8', 'Sector 10', 'Binnen 1', 'Buiten 1']
    expect(defaultWallSelection('Klimax', walls)).toEqual(walls.slice(0, 7))
    expect(defaultWallSelection('KLIMAX', [' sector 2 '])).toEqual([' sector 2 '])
    expect(defaultWallSelection('Other gym', walls)).toEqual([])
    expect(defaultWallSelection('Klimax', ['Buiten 1'])).toEqual([])
  })

  it('includes future removal and excludes removed or not-yet-set routes', () => {
    expect(isActive(route('live'), now.getTime())).toBe(true)
    expect(isActive(route('gone', 600, '2026-09-27'), now.getTime())).toBe(false)
    expect(isActive(route('later', 600, '2026-09-29'), now.getTime())).toBe(true)
    expect(isActive({ ...route('new'), inAt: '2026-09-29' }, now.getTime())).toBe(false)
    expect(isActive(route('invalid', 600, 'nonsense'), now.getTime())).toBe(false)
  })

  it('counts tops only with a top and a numeric total', () => {
    const climbUser = { grade: null, tickType: 1, totalTries: 2, triedFirstAtDate: null, tickedFirstAtDate: null }
    expect(topCount({ ...climbUser, totalTicks: 3 })).toBe(3)
    expect(topCount({ ...climbUser, totalTicks: null })).toBe(0)
    expect(topCount(climbUser)).toBe(0)
    expect(topCount({ ...climbUser, tickType: 0, totalTicks: 2 })).toBe(0)
  })
})

describe('your log', () => {
  it('lists valid, genuine logs newest first with their kind', () => {
    const logs = visibleLogs([
      routeLog('try', '2026-09-01', { topped: false, ticked: false, tickType: null, tickIndex: null, tryIndex: 1 }),
      routeLog('first', '2026-09-01', { tickType: 3, tryIndex: 2 }),
      routeLog('generated', '2026-09-01', { topped: false, autoAdded: true }),
      routeLog('invalid', '2026-09-20', { valid: false }),
      routeLog('repeat', '2026-09-20', { tickIndex: 1 }),
    ])
    expect(logs.map(l => l.id)).toEqual(['repeat', 'first', 'try'])
    expect(logs.map(logKind)).toEqual(['Repeat', 'Onsight', 'Try'])
    expect(dayLabel('2026-09-28', now)).toBe('Today')
    expect(dayLabel('2026-09-27', now)).toBe('Yesterday')
    expect(dayLabel('2026-08-12', now)).toBe('12 Aug')
    expect(dayLabel('2025-08-12', now)).toBe('12 Aug 2025')
  })
})

describe('top 10', () => {
  it('keeps the best ascent per route, breaks ties by date and includes removed routes', () => {
    const ranked = topTen([route('a'), route('b'), route('removed', 700, '2026-09-01')], [log('a', 2, '2026-09-10'), log('a', 1), log('a', 2, '2026-09-25'), log('b', 2, '2026-09-24'), log('removed')], 'gym', 60, now)
    expect(ranked.map(i => [i.route.id, i.score, i.ascent.climbedAtDate])).toEqual([['removed', 700, '2026-09-20'], ['a', 610, '2026-09-25'], ['b', 610, '2026-09-24']])
  })

  it('respects period boundaries, gym, validity, route type and future dates', () => {
    const start = new Date(now)
    start.setDate(start.getDate() - 60)
    const day = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    expect(topTen([route('a')], [log('a', 1, day)], 'gym', 60, now)).toHaveLength(1)
    for (const item of [log('a', 1, '2026-01-01'), log('a', 1, '2026-09-29'), log('a', 1, '2026-09-20', 'other'), { ...log('a'), valid: false }, { ...log('a'), ticked: false }, { ...log('a'), topped: false }, { ...log('a'), climbType: 'boulder' }]) {
      expect(topTen([route('a')], [item], 'gym', 60, now)).toHaveLength(0)
    }
    const many = Array.from({ length: 15 }, (_, i) => route(String(i), 600 + i))
    expect(topTen(many, many.map(r => log(r.id)), 'gym', 180, now)).toHaveLength(10)
  })

  it('days left matches the window', () => {
    for (const [date, left] of [['2026-09-28', 60], ['2026-07-31', 1], ['2026-07-30', 0]] as const) {
      expect(daysLeft(date, 60, now)).toBe(left)
      expect(topTen([route('r')], [log('r', 1, date)], 'gym', 60, now)).toHaveLength(1)
    }
    expect(topTen([route('r')], [log('r', 1, '2026-07-29')], 'gym', 60, now)).toHaveLength(0)
    expect([0, 1, 5].map(daysLeftLabel)).toEqual(['Expires today', '1 day left', '5 days left'])
  })
})
