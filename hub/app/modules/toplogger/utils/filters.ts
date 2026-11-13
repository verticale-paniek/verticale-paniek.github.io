import { FRENCH_GRADES, frenchGrade } from '~/shell/toplogger/domain'

export interface GradeRange {
  gradeMin: number | null
  gradeMax: number | null
  ungraded: 'include' | 'exclude' | 'only'
}

/** Normalize to the displayed French grade, including community grades between steps. */
export function gradeStep(grade: number | null | undefined): number | null {
  return FRENCH_GRADES.find(value => frenchGrade(value) === frenchGrade(grade)) ?? null
}

export function matchesGrades(grade: number | null | undefined, range: GradeRange): boolean {
  const step = gradeStep(grade)
  if (step === null) {
    return range.ungraded !== 'exclude'
  }
  return range.ungraded !== 'only'
    && (range.gradeMin === null || step >= range.gradeMin)
    && (range.gradeMax === null || step <= range.gradeMax)
}

/** Validate saved filters, migrating previous single/multiple grade selections to a range. */
export function routeFilters(value?: unknown) {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const legacy = (Array.isArray(saved.grades) ? saved.grades : saved.grade ? [saved.grade] : [])
    .filter((grade): grade is string => typeof grade === 'string' && (grade === '?' || (grade.trim() !== '' && Number.isFinite(Number(grade)))))
  const numeric = legacy.map(grade => gradeStep(Number(grade))).filter((grade): grade is number => grade !== null)
  const hasUnknown = legacy.some(grade => gradeStep(Number(grade)) === null)
  let gradeMin = typeof saved.gradeMin === 'number' ? gradeStep(saved.gradeMin) : numeric.length ? Math.min(...numeric) : null
  let gradeMax = typeof saved.gradeMax === 'number' ? gradeStep(saved.gradeMax) : numeric.length ? Math.max(...numeric) : null
  if (gradeMin !== null && gradeMax !== null && gradeMin > gradeMax) {
    [gradeMin, gradeMax] = [gradeMax, gradeMin]
  }
  const ungraded: GradeRange['ungraded'] = saved.ungraded === 'only' || saved.ungraded === 'exclude' || saved.ungraded === 'include'
    ? saved.ungraded
    : hasUnknown ? numeric.length ? 'include' : 'only' : numeric.length ? 'exclude' : 'include'
  return {
    showFilters: saved.showFilters === true,
    gradeMin, gradeMax, ungraded,
    status: typeof saved.status === 'string' && ['', 'todo', 'new'].includes(saved.status) ? saved.status : '',
    walls: Array.isArray(saved.walls) ? saved.walls.filter((wall): wall is string => typeof wall === 'string') : [],
    wallsChosen: saved.wallsChosen === true,
  }
}
