// The circuit being built. In memory only: it survives moving between the editor and the runner, not a reload.
import { reactive } from 'vue'
import { getProfile, profilesFor, type Family, type Slot } from './plan'

let nextKey = 1

function makeSlot(family: Family, profileId?: string, option?: string): Slot {
  const profile = (profileId && getProfile(profileId)) || profilesFor(family)[0]!
  return { key: nextKey++, family, profileId: profile.id, option: option && profile.options.includes(option) ? option : profile.options[0]! }
}

interface Pick { family: Family, profileId: string, option: string }

export interface Preset {
  id: string
  title: string
  rounds: number
  /** Each exercise starts by itself when the previous one ends (only the first has the lead-in). */
  chain: boolean
  picks: Pick[]
}

const abs = (option: string): Pick => ({ family: 'core', profileId: 'core-abs', option })

export const presets: Preset[] = [
  {
    id: 'strength',
    title: 'Strength circuit',
    rounds: 2,
    chain: false,
    picks: [
      { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 25 mm' },
      { family: 'core', profileId: 'core-202020', option: 'Plank: 20 s flat, 20 s left leg up, 20 s right leg up' },
      { family: 'strength', profileId: 'strength-free', option: 'Shoulder press with weight, 5 each side' },
      { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 20 mm' },
      { family: 'core', profileId: 'core-202020', option: 'Sit-ups/crunches 20s fast going up, 20s slow going down, 20s normal' },
      { family: 'strength', profileId: 'strength-free', option: 'Pull-ups ×8' },
    ],
  },
  {
    id: 'abs',
    title: 'Abs circuit',
    rounds: 1,
    chain: true,
    picks: (getProfile('core-abs')?.options ?? []).map(abs),
  },
]

const slotsFor = (preset: Preset): Slot[] => preset.picks.map(p => makeSlot(p.family, p.profileId, p.option))

const circuit = reactive({
  presetId: presets[0]!.id,
  rounds: presets[0]!.rounds,
  chain: presets[0]!.chain,
  slots: slotsFor(presets[0]!),
})

export function useCircuit() {
  function load(id: string) {
    const preset = presets.find(p => p.id === id) ?? presets[0]!
    circuit.presetId = preset.id
    circuit.rounds = preset.rounds
    circuit.chain = preset.chain
    circuit.slots = slotsFor(preset)
  }

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

  /** Back to the selected preset as it was. */
  function reset() {
    load(circuit.presetId)
  }

  return { circuit, presets, load, add, remove, setProfile, setRounds, reset }
}
