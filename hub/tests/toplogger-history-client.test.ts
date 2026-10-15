import { describe, expect, it } from 'vitest'
import type { Ascent, Route } from '~/modules/toplogger/utils/domain'
import { canRank, validAscents } from '~/modules/toplogger/utils/history'

const now = Date.parse('2026-09-28T12:00:00Z')
const ascent = (climbId: string, date: string, extra: Partial<Ascent> = {}): Ascent =>
  ({ id: `${climbId}-${date}`, gymId: 'g', climbId, climbType: 'route', tickType: 1, climbedAtDate: date, valid: true, ticked: true, topped: true, ...extra })
const route = (id: string) => ({ id, grade: 600 }) as Route

describe('validAscents', () => {
  it('accepts a well-formed saved history for this gym', () => {
    const saved = [ascent('a', '2026-09-01'), ascent('b', '2026-09-02')]
    expect(validAscents(saved, 'g')).toEqual(saved)
    expect(validAscents([], 'g')).toEqual([])
  })

  it('refuses anything else, so a corrupt or foreign cache is ignored', () => {
    expect(validAscents('broken', 'g')).toBeNull()
    expect(validAscents(null, 'g')).toBeNull()
    expect(validAscents([ascent('a', '2026-09-01', { gymId: 'other' })], 'g')).toBeNull()
    expect(validAscents([{ ...ascent('a', '2026-09-01'), climbedAtDate: 'soon' }], 'g')).toBeNull()
    expect(validAscents([null], 'g')).toBeNull()
  })
})

describe('canRank', () => {
  it('needs every qualifying ascent in the window to have a known route', () => {
    const logs = [ascent('a', '2026-09-20'), ascent('missing', '2026-09-20')]
    expect(canRank(logs, [route('a')], 'g', now)).toBe(false)
    expect(canRank(logs, [route('a'), route('missing')], 'g', now)).toBe(true)
  })

  it('ignores logs that could never rank', () => {
    const logs = [
      ascent('x', '2026-09-20', { valid: false }), ascent('x', '2026-09-20', { topped: false }), ascent('x', '2026-09-20', { ticked: false }),
      ascent('x', '2026-09-20', { climbType: 'boulder' }), ascent('x', '2026-09-20', { gymId: 'other' }), ascent('x', '2025-01-01'),
    ]
    expect(canRank(logs, [], 'g', now)).toBe(true)
  })
})
