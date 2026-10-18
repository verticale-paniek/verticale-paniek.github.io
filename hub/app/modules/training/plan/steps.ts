import type { PhaseKind, Timer } from './types'

export interface Step {
  label: string
  seconds: number
  kind: PhaseKind
  /** 1-based pass of the repeat, and the total number of passes. */
  pass: number
  passes: number
}

/**
 * Flattens a timer into its steps: the lead-in, then the phases repeated. A rest at the very end is dropped (nothing
 * follows it), as interval-timer apps do: 7 on / 3 off × 8 ends after the eighth hang.
 */
export function buildSteps(timer: Timer): Step[] {
  const passes = Array.from({ length: timer.repeat }, (_, pass) =>
    timer.phases.map(phase => ({ ...phase, pass: pass + 1, passes: timer.repeat }))).flat()
  if (passes.length > 1 && passes.at(-1)?.kind === 'rest') {
    passes.pop()
  }
  return timer.leadIn > 0 ? [{ label: 'Get ready', seconds: timer.leadIn, kind: 'ready', pass: 1, passes: 1 }, ...passes] : passes
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

/** `start` is only played when a timer is started; `cueFor` never returns it. */
export type Cue = 'tick' | 'phase' | 'done' | 'start'

/**
 * What to signal when a timer moves from `prev` to `next`: a tick for each of the last three seconds of a step,
 * a phase cue when the step changes, and a done cue at the end. Nothing at the very start.
 */
export function cueFor(prev: Position | null, next: Position): Cue | null {
  if (!prev) {
    return null
  }
  if (next.done) {
    return prev.done ? null : 'done'
  }
  if (next.index !== prev.index) {
    return 'phase'
  }
  return next.remaining !== prev.remaining && next.remaining <= 3 ? 'tick' : null
}
