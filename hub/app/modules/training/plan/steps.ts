import type { Timer } from './types'

export interface Step {
  label: string
  seconds: number
  /** 1-based pass of the repeat, and the total number of passes. */
  pass: number
  passes: number
}

/** Flattens a timer into its steps: the phases, repeated. */
export function buildSteps(timer: Timer): Step[] {
  return Array.from({ length: timer.repeat }, (_, pass) =>
    timer.phases.map(phase => ({ label: phase.label, seconds: phase.seconds, pass: pass + 1, passes: timer.repeat }))).flat()
}

export const totalSeconds = (steps: Step[]) => steps.reduce((sum, s) => sum + s.seconds, 0)

export interface Position {
  /** Index of the current step, or steps.length when finished. */
  index: number
  /** Whole seconds left in the current step (rounded up), 0 when finished. */
  remaining: number
  done: boolean
}

/** Where a timer is after `elapsedMs` of running. */
export function positionAt(steps: Step[], elapsedMs: number): Position {
  let left = Math.max(0, elapsedMs)
  for (const [index, step] of steps.entries()) {
    const length = step.seconds * 1000
    if (left < length) {
      return { index, remaining: Math.ceil((length - left) / 1000), done: false }
    }
    left -= length
  }
  return { index: steps.length, remaining: 0, done: true }
}
