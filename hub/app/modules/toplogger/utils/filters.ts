import { frenchGrade } from '~/shell/toplogger/domain'

export function gradeFilterKey(grade: number | null | undefined): string {
  return frenchGrade(grade) === '?' ? '?' : String(grade)
}

export function matchesGrades(grade: number | null | undefined, selected: string[]): boolean {
  return !selected.length || selected.includes(gradeFilterKey(grade))
}

/** Validate saved route filters before restoring them after a page refresh. */
export function routeFilters(value?: unknown) {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    showFilters: saved.showFilters === true,
    grades: [...new Set((Array.isArray(saved.grades) ? saved.grades : saved.grade ? [saved.grade] : [])
      .filter((grade): grade is string => typeof grade === 'string' && (grade === '?' || (grade.trim() !== '' && Number.isFinite(Number(grade)))))
      .map(grade => grade === '?' ? '?' : gradeFilterKey(Number(grade))))],
    status: typeof saved.status === 'string' && ['', 'todo', 'new'].includes(saved.status) ? saved.status : '',
    walls: Array.isArray(saved.walls) ? saved.walls.filter((wall): wall is string => typeof wall === 'string') : [],
    wallsChosen: saved.wallsChosen === true,
  }
}
