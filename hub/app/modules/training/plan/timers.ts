import type { Timer, TimerId } from './types'

export const timers: Timer[] = [
  { id: 'interval-7-3', label: '7 s on / 3 s off × 8', phases: [{ label: 'On', seconds: 7 }, { label: 'Off', seconds: 3 }], repeat: 8 },
  { id: 'triple-20', label: '20 / 20 / 20 s', phases: [{ label: 'One', seconds: 20 }, { label: 'Two', seconds: 20 }, { label: 'Three', seconds: 20 }], repeat: 1 },
  { id: 'hold-60', label: '60 s', phases: [{ label: 'Go', seconds: 60 }], repeat: 1 },
  { id: 'rest-120', label: '2 min rest', phases: [{ label: 'Rest', seconds: 120 }], repeat: 1 },
]

export const getTimer = (id: TimerId) => timers.find(t => t.id === id)
