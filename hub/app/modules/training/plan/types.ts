// Training definitions. Code for now; the circuits (the weekly picks) move to the database once the shape is settled.

/** The few ways a slot can be timed. */
export type TimerId = 'interval-7-3' | 'triple-20' | 'hold-60' | 'rest-120'

export interface Timer {
  id: TimerId
  label: string
  /** The beep sequence, in seconds: [phase length, ...]. `repeat` repeats it. Not used by the UI yet. */
  phases: { label: string, seconds: number }[]
  repeat: number
}

/** One of the circuit's slots. The text carries the options; whether they need to be codified is decided later. */
export interface Slot {
  /** What the slot is for, e.g. 'Fingers'. */
  label: string
  /** Absent for untimed slots. */
  timer?: TimerId
  text: string
}

export interface Circuit {
  id: string
  title: string
  /** Times the slots are repeated. */
  rounds: number
  note?: string
  slots: Slot[]
}
