import { describe, expect, it } from 'vitest'
import { matchesGrades, routeFilters } from '~/modules/toplogger/utils/filters'

describe('grade ranges', () => {
  const grades = [0, 500, 600, 617, 633, 650, 700]

  it('includes every grade between inclusive endpoints', () => {
    const range = routeFilters({ gradeMin: 600, gradeMax: 650, ungraded: 'exclude' })
    expect(grades.filter(grade => matchesGrades(grade, range))).toEqual([600, 617, 633, 650])
    expect(matchesGrades(601, range)).toBe(true)
    expect(matchesGrades(658, range)).toBe(true)
    expect(matchesGrades(659, range)).toBe(false)
  })

  it('independently includes, hides or selects only ungraded routes', () => {
    const range = routeFilters({ gradeMin: 600, gradeMax: 600 })
    expect(grades.filter(grade => matchesGrades(grade, range))).toEqual([0, 600])
    expect(matchesGrades(null, range)).toBe(true)
    expect(matchesGrades(undefined, range)).toBe(true)
    expect(matchesGrades(0, { ...range, ungraded: 'exclude' })).toBe(false)
    expect(grades.filter(grade => matchesGrades(grade, { ...range, ungraded: 'only' }))).toEqual([0])
    expect(grades.filter(grade => matchesGrades(grade, routeFilters()))).toEqual(grades)
  })

  it('persists ranges and migrates both old grade filter formats', () => {
    const saved = routeFilters({ gradeMin: 500, gradeMax: 700, ungraded: 'exclude', status: 'todo', walls: ['Sector 1'], wallsChosen: true })
    expect(routeFilters(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
    expect(routeFilters({ grades: ['?', '600', '650'] })).toMatchObject({ gradeMin: 600, gradeMax: 650, ungraded: 'include' })
    expect(routeFilters({ grade: '600' })).toMatchObject({ gradeMin: 600, gradeMax: 600, ungraded: 'exclude' })
    expect(routeFilters({ grade: '0' })).toMatchObject({ gradeMin: null, gradeMax: null, ungraded: 'only' })
    expect(routeFilters({ grades: ['600', null, {}, '', 'bad', '600'] })).toMatchObject({ gradeMin: 600, gradeMax: 600, ungraded: 'exclude' })
  })

  it('repairs reversed or malformed saved filters', () => {
    expect(routeFilters({ gradeMin: 700, gradeMax: 500 })).toMatchObject({ gradeMin: 500, gradeMax: 700 })
    expect(routeFilters({ gradeMin: 'bad', gradeMax: NaN, ungraded: 'bad', status: 'attempted' })).toEqual(routeFilters())
    expect(routeFilters({ color: 'Red' })).not.toHaveProperty('color')
  })
})
