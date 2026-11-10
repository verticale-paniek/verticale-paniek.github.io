import { describe, expect, it } from 'vitest'
import { matchesGrades, routeFilters } from '~/modules/toplogger/utils/filters'

describe('grade selections', () => {
  it('includes any selected grade and optionally ungraded routes', () => {
    const grades = [0, 500, 600, 650, 700]
    expect(grades.filter(grade => matchesGrades(grade, ['600', '650']))).toEqual([600, 650])
    expect(grades.filter(grade => matchesGrades(grade, ['?', '600']))).toEqual([0, 600])
    expect(matchesGrades(null, ['?'])).toBe(true)
    expect(matchesGrades(undefined, ['?'])).toBe(true)
    expect(grades.filter(grade => matchesGrades(grade, []))).toEqual(grades)
  })

  it('restores multiple grades and migrates the old single-grade filter without hidden removed filters', () => {
    const saved = routeFilters({ grades: ['?', '600', '650'], status: 'todo', walls: ['Sector 1'], wallsChosen: true })
    expect(routeFilters(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
    const migrated = routeFilters({ grade: '0', color: 'Red', status: 'attempted' })
    expect(migrated.grades).toEqual(['?'])
    expect(migrated.status).toBe('')
    expect(migrated).not.toHaveProperty('color')
    expect(routeFilters({ grade: '600' }).grades).toEqual(['600'])
    expect(routeFilters({ grades: ['600', null, {}, '', 'bad', '600'] }).grades).toEqual(['600'])
  })
})
