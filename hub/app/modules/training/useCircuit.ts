// The circuit being built. In memory only: it survives moving between the editor and the runner, not a reload.
import { reactive } from 'vue'
import { getProfile, profilesFor, type Family, type Slot } from './plan'

let nextKey = 1

function makeSlot(family: Family): Slot {
  const profile = profilesFor(family)[0]!
  return { key: nextKey++, family, profileId: profile.id, option: profile.options[0]! }
}

const defaultSlots = (): Slot[] => (['fingers', 'core', 'strength', 'fingers', 'core', 'strength'] as Family[]).map(makeSlot)

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
