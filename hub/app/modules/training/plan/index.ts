import { circuits } from './circuits'
import { getTimer, timers } from './timers'
import type { Circuit } from './types'

export { circuits, getTimer, timers }
export type { Circuit }

export const COLLECTION = 'klimax-2021'

export const getCircuit = (id: string) => circuits.find(c => c.id === id)
