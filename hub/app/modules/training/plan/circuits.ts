// Example circuits. The text of a slot lists the options for that timer type; which one is done is not tracked.
import type { Circuit } from './types'

export const circuits: Circuit[] = [
  {
    id: 'phase-1',
    title: 'Phase 1: medium',
    rounds: 2,
    note: 'Fingers, core, strength, twice, then the whole circuit again.',
    slots: [
      { label: 'Fingers', timer: 'interval-7-3', text: 'Edge hangs 25 mm, or campus deadhangs.' },
      { label: 'Core', timer: 'triple-20', text: 'Plank (20 s flat, 20 s left leg up, 20 s right leg up), deadhang with leg raises, crunches.' },
      { label: 'Strength', text: 'Shoulder press with weight (5 each side), pull-ups ×8, push-ups ×8 (in the rings), hang from a hold and tap left / middle / right.' },
      { label: 'Fingers', timer: 'interval-7-3', text: 'Edge hangs 25 mm, or campus deadhangs.' },
      { label: 'Core', timer: 'triple-20', text: 'Plank, deadhang with leg raises, crunches, sit-ups.' },
      { label: 'Strength', text: 'Shoulder press with weight (5 each side), pull-ups ×8, push-ups ×8 (in the rings), ab roller ×8.' },
    ],
  },
  {
    id: 'phase-2',
    title: 'Phase 2: hard',
    rounds: 1,
    note: 'You count the 5 s yourselves; the timer is for the rest between.',
    slots: [
      { label: 'Fingers', timer: 'rest-120', text: 'One-arm edge hang: 5 s left, 5 s right, rest, again.' },
      { label: 'Core', timer: 'hold-60', text: 'Abs for 1 min, or plank in the rings for 60 s.' },
      { label: 'Strength', timer: 'rest-120', text: 'Front lever / plank on the bar (5 s on, 5 s off, 5 s on), or one-arm lock-off at 90° (5 s left, 5 s right), or ring dips ×5.' },
      { label: 'Fingers', timer: 'rest-120', text: 'One-arm sloper: 5 s left, 5 s right, rest, again.' },
      { label: 'Core', timer: 'hold-60', text: 'Abs for 1 min.' },
      { label: 'Strength', timer: 'rest-120', text: 'Pull-ups ×8 twice, or box jumps ×4 twice, with 2 min rest between.' },
    ],
  },
]
