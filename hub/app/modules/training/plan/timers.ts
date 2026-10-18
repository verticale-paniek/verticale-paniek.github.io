import type { Timer, TimerId } from './types'

// Work is green, rest blue, get-ready orange (like a typical interval-timer app). Intervals and holds start with a 5 s
// lead-in; the 2 min rest has none but ends with a 5 s get-ready.
export const timers: Timer[] = [
  {
    id: 'interval-7-3',
    label: '7 s on / 3 s off × 8',
    leadIn: 5,
    phases: [{ label: 'Go', seconds: 7, kind: 'work' }, { label: 'Rest', seconds: 3, kind: 'rest' }],
    repeat: 8,
  },
  {
    id: 'interval-60-30',
    label: '60 s on / 30 s off',
    leadIn: 5,
    phases: [{ label: 'Go', seconds: 60, kind: 'work' }, { label: 'Rest', seconds: 30, kind: 'rest' }],
    repeat: 1,
  },
  {
    id: 'triple-20',
    label: '20 / 20 / 20 s',
    leadIn: 5,
    phases: [{ label: 'Part 1', seconds: 20, kind: 'work' }, { label: 'Part 2', seconds: 20, kind: 'work' }, { label: 'Part 3', seconds: 20, kind: 'work' }],
    repeat: 1,
  },
  {
    id: 'hold-60',
    label: '60 s',
    leadIn: 5,
    phases: [{ label: 'Go', seconds: 60, kind: 'work' }],
    repeat: 1,
  },
  {
    id: 'rest-120',
    label: '2 min rest',
    leadIn: 0,
    phases: [{ label: 'Rest', seconds: 115, kind: 'rest' }, { label: 'Get ready', seconds: 5, kind: 'ready' }],
    repeat: 1,
  },
]

export const getTimer = (id: TimerId) => timers.find(t => t.id === id)
