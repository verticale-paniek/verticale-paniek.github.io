// Sound, vibration and screen-awake for the timers. All of it is best effort: a phone or browser without one of
// them just skips it.
import { reactive } from 'vue'
import type { Cue } from '../plan'

/** The climber's choices, in memory like the circuit. */
export const feedback = reactive({ sound: true, vibration: true })

let audio: AudioContext | undefined

/** Must be called from a tap (Start): browsers only allow audio after a user gesture. */
export function prepareAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') {
      void audio.resume()
    }
  }
  catch { /* no audio available */ }
}

function tone(frequency: number, start: number, length: number) {
  if (!audio) {
    return
  }
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  const at = audio.currentTime + start
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start(at)
  oscillator.stop(at + length + 0.02)
}

const sounds: Record<Cue, () => void> = {
  start: () => tone(988, 0, 1.5),
  tick: () => tone(880, 0, 0.12),
  phase: () => tone(1320, 0, 0.4),
  done: () => {
    tone(1760, 0, 0.2)
    tone(1320, 0.3, 0.2)
    tone(1760, 0.6, 0.5)
  },
}

const buzzes: Record<Cue, number | number[]> = {
  start: 1000,
  tick: 30,
  phase: 250,
  done: [200, 100, 200, 100, 400],
}

export function signal(cue: Cue) {
  if (feedback.sound) {
    try {
      sounds[cue]()
    }
    catch { /* ignore */ }
  }
  if (feedback.vibration) {
    try {
      navigator.vibrate?.(buzzes[cue])
    }
    catch { /* ignore */ }
  }
}

let lock: WakeLockSentinel | null = null

/** Keeps the screen on while a timer runs. Released when it stops; re-requested if the tab comes back to the front. */
export async function holdScreen() {
  try {
    if (!lock || lock.released) {
      lock = (await navigator.wakeLock?.request('screen')) ?? null
    }
  }
  catch { /* not allowed or not supported */ }
}

export async function releaseScreen() {
  try {
    await lock?.release()
  }
  catch { /* ignore */ }
  lock = null
}
