// The circuit being built. In memory only: it survives moving between the editor and the runner, not a reload.
import { reactive } from 'vue'
import { getProfile, profilesFor, type Family, type Slot } from './plan'

let nextKey = 1

function makeSlot(family: Family, profileId?: string, option?: string): Slot {
  const profile = (profileId && getProfile(profileId)) || profilesFor(family)[0]!
  return { key: nextKey++, family, profileId: profile.id, option: option && profile.options.includes(option) ? option : profile.options[0]! }
}

/** The circuit you start with: the first three slots are the first options, the next three are picked below. */
export const defaultPicks: { family: Family, profileId: string, option: string }[] = [
  { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 25 mm' },
  { family: 'core', profileId: 'core-202020', option: 'Plank: 20 s flat, 20 s left leg up, 20 s right leg up' },
  { family: 'strength', profileId: 'strength-free', option: 'Shoulder press with weight, 5 each side' },
  { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 20 mm' },
  { family: 'core', profileId: 'core-202020', option: 'Sit-ups/crunches 20s fast going up, 20s slow going down, 20s normal' },
  { family: 'strength', profileId: 'strength-free', option: 'Pull-ups ×8' },
]

const defaultSlots = (): Slot[] => defaultPicks.map(p => makeSlot(p.family, p.profileId, p.option))

const circuit = reactive({
  rounds: 2,
  slots: defaultSlots(),
})

export function useCircuit() {
  function add(family: Family) {
    circuit.slots.push(makeSlot(family))
  }

  function remove(key: number) {
    circuit.slots = circuit.slots.filter(s => s.key !== key)
  }

  /** Picking another timer profile resets the exercise to that profile's first option. */
  function setProfile(slot: Slot, profileId: string) {
    const profile = getProfile(profileId)
    if (profile) {
      slot.profileId = profile.id
      slot.option = profile.options[0]!
    }
  }

  function setRounds(rounds: number) {
    circuit.rounds = Math.min(5, Math.max(1, rounds))
  }

  function reset() {
    circuit.rounds = 2
    circuit.slots = defaultSlots()
  }

  return { circuit, add, remove, setProfile, setRounds, reset }
}
