/** Validate saved route filters before restoring them after a page refresh. */
export function routeFilters(value?: unknown) {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    showFilters: saved.showFilters === true,
    grade: typeof saved.grade === 'string' ? saved.grade : '',
    color: typeof saved.color === 'string' ? saved.color : '',
    status: typeof saved.status === 'string' && ['', 'untried', 'attempted', 'todo', 'topped', 'new'].includes(saved.status) ? saved.status : '',
    walls: Array.isArray(saved.walls) ? saved.walls.filter((wall): wall is string => typeof wall === 'string') : [],
    wallsChosen: saved.wallsChosen === true,
  }
}
