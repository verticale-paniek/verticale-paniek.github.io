// Training definitions. In code for now; the profiles and their options may move to the database later.

/** The few ways an exercise can be timed. */
export type TimerId = 'interval-7-3' | 'triple-20' | 'hold-60' | 'rest-120'

export interface Timer {
  id: TimerId
  label: string
  /** One pass of the beep sequence; `repeat` passes make the whole timer. */
  phases: { label: string, seconds: number }[]
  repeat: number
}

export type Family = 'fingers' | 'core' | 'strength'

/**
 * A timer profile: a timer type (or none) and the exercises that fall under it.
 * Picking the profile picks the timer; picking an option says what is done. Options are plain text for now.
 */
export interface Profile {
  id: string
  family: Family
  title: string
  /** Absent for untimed exercises. */
  timer?: TimerId
  options: string[]
}

/** One slot of the circuit being built (in memory only). */
export interface Slot {
  /** Stable key for lists; not stored anywhere. */
  key: number
  family: Family
  profileId: string
  option: string
}
