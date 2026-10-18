import type { Family, Profile } from './types'

export const families: { id: Family, title: string }[] = [
  { id: 'fingers', title: 'Fingers' },
  { id: 'core', title: 'Core' },
  { id: 'strength', title: 'Strength' },
]

// Options come from the 2021 Klimax document. Edit freely; which option is picked is not tracked.
export const profiles: Profile[] = [
  {
    id: 'fingers-73',
    family: 'fingers',
    title: '7 s on / 3 s off × 8',
    timer: 'interval-7-3',
    options: ['Edge hangs 25 mm', 'Edge hangs 20 mm', 'Sloper hangs'],
  },
  {
    id: 'fingers-one-arm',
    family: 'fingers',
    title: 'One arm: 5 s left, 5 s right, 2 min rest, again',
    timer: 'rest-120',
    options: ['One-arm edge hang', 'One-arm sloper'],
  },
  {
    id: 'core-202020',
    family: 'core',
    title: '20 / 20 / 20 s',
    timer: 'triple-20',
    options: [
      'Plank: 20 s flat, 20 s left leg up, 20 s right leg up',
      'Deadhang: 20 s straight, 20 s leg raises, 20 s straight',
      'Superman: arm forward / back, then left and right',
      'Plank on the left, then right, moving the arm',
      'Sit-ups/crunches: 20 s straight, 20 s left twist, 20 s right twist',
      'Sit-ups/crunches 20s fast going up, 20s slow going down, 20s normal',
    ],
  },
  {
    id: 'core-60',
    family: 'core',
    title: '60 s',
    timer: 'hold-60',
    options: ['Abs, 1 min', 'Plank in the rings, 60 s', 'Sit-ups / crunches, 1 min'],
  },
  {
    id: 'core-abs',
    family: 'core',
    title: '60 s on / 30 s off (abs circuit)',
    timer: 'interval-60-30',
    options: [
      'Crunches',
      'Sitting up straight, leg raises',
      'Plank',
      'Superman, arm forward / back (30 s left, 30 s right)',
      'Plank on the left, moving the arm',
      'Plank on the right, moving the arm',
      'On your back, knees pulled up, touch ankles left / right',
      'Superman, one foot / one arm (30 s left, 30 s right)',
      'Windscreen wiper: on your back, legs straight up, move left / right',
      'Sitting, legs off the floor, pass something across, tap left / right (+1 each time)',
    ],
  },
  {
    id: 'strength-free',
    family: 'strength',
    title: 'Untimed',
    options: [
      'Shoulder press with weight, 5 each side',
      'Pull-ups ×8',
      'Push-ups ×8',
      'Push-ups in the rings ×8',
      'Typewriter pull-ups',
      'Ab roller ×8',
      'Hang from a hold and tap left / middle / right (low, middle, high)',
      'Ring dips ×5',
    ],
  },
  {
    id: 'strength-rest',
    family: 'strength',
    title: '5 s efforts, 2 min rest',
    timer: 'rest-120',
    options: [
      'Front lever / plank on the bar: 5 s on, 5 s off, 5 s on, twice',
      'One-arm lock-off at 90°: 5 s left, 5 s right, twice',
      'Pull-ups ×8, twice',
      'Box jumps ×4, twice',
    ],
  },
]

export const getProfile = (id: string) => profiles.find(p => p.id === id)
export const profilesFor = (family: Family) => profiles.filter(p => p.family === family)
