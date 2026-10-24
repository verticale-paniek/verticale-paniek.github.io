// The sessions being made: named lists of blocks. In memory only: they survive moving between screens, not a reload.
// Making a session (edit screens) and running it (run screens) are separate; both work on the active session and
// the current block.
import { computed, reactive } from 'vue'
import { getProfile, profilesFor, type Family, type Slot } from './plan'
import { mainOptions, stretchOptions, warmupOptions } from './plan/options'

let nextKey = 1

function makeSlot(family: Family, profileId?: string, option?: string): Slot {
  const profile = (profileId && getProfile(profileId)) || profilesFor(family)[0]!
  return { key: nextKey++, family, profileId: profile.id, option: option && profile.options.includes(option) ? option : profile.options[0]! }
}

interface Pick { family: Family, profileId: string, option: string }

export interface Preset {
  id: string
  title: string
  /** A circuit has slots and timers; a pick block is a list of things chosen from a pool, plus a note. */
  kind: 'circuit' | 'pick'
  rounds: number
  /** Each exercise starts by itself when the previous one ends (only the first has the lead-in). */
  chain: boolean
  picks: Pick[]
  /** Pick blocks: what can be chosen, and what is chosen at first. */
  pool: string[]
  defaults: string[]
}

const circuit = (id: string, title: string, rounds: number, chain: boolean, picks: Pick[]): Preset =>
  ({ id, title, kind: 'circuit', rounds, chain, picks, pool: [], defaults: [] })

const pick = (id: string, title: string, pool: string[], defaults: string[]): Preset =>
  ({ id, title, kind: 'pick', rounds: 1, chain: false, picks: [], pool, defaults })

const abs = (option: string): Pick => ({ family: 'core', profileId: 'core-abs', option })

export const presets: Preset[] = [
  circuit('strength', 'Strength circuit', 2, false, [
    { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 25 mm' },
    { family: 'core', profileId: 'core-202020', option: 'Plank: 20 s flat, 20 s left leg up, 20 s right leg up' },
    { family: 'strength', profileId: 'strength-free', option: 'Shoulder press with weight, 5 each side' },
    { family: 'fingers', profileId: 'fingers-73', option: 'Edge hangs 20 mm' },
    { family: 'core', profileId: 'core-202020', option: 'Sit-ups/crunches 20s fast going up, 20s slow going down, 20s normal' },
    { family: 'strength', profileId: 'strength-free', option: 'Pull-ups ×8' },
  ]),
  circuit('abs', 'Abs circuit', 1, true, (getProfile('core-abs')?.options ?? []).map(abs)),
  circuit('empty', 'Empty circuit', 1, false, []),
  pick('stretch', 'Stretch', stretchOptions, stretchOptions),
  pick('warmup', 'Warm-up', warmupOptions, [warmupOptions[0]!]),
  pick('main', 'Main', mainOptions, []),
]

/** The sessions that exist at the start; preset ids, in order. */
export const seedSessions: { name: string, blocks: string[] }[] = [
  { name: 'Full evening', blocks: ['stretch', 'warmup', 'strength', 'main'] },
  { name: 'Strength circuit', blocks: ['strength'] },
  { name: 'Abs circuit', blocks: ['abs'] },
]

export interface Block {
  /** Stable key for lists; not stored anywhere. */
  key: number
  presetId: string
  title: string
  kind: Preset['kind']
  /** Ticked by hand while running the session. */
  done: boolean
  /** Circuit blocks. */
  rounds: number
  chain: boolean
  slots: Slot[]
  /** Pick blocks: what can be chosen, what is chosen, and free text. */
  pool: string[]
  choices: string[]
  note: string
}

export interface Session {
  key: number
  name: string
  blocks: Block[]
}

const findPreset = (id: string) => presets.find(p => p.id === id) ?? presets[0]!

const makeBlock = (preset: Preset): Block => ({
  key: nextKey++,
  presetId: preset.id,
  title: preset.title,
  kind: preset.kind,
  done: false,
  rounds: preset.rounds,
  chain: preset.chain,
  slots: preset.picks.map(p => makeSlot(p.family, p.profileId, p.option)),
  pool: preset.pool,
  choices: [...preset.defaults],
  note: '',
})

const cloneBlock = (block: Block): Block => ({
  ...block,
  key: nextKey++,
  done: false,
  slots: block.slots.map(s => ({ ...s, key: nextKey++ })),
  choices: [...block.choices],
})

const makeSession = (name: string, presetIds: string[]): Session =>
  ({ key: nextKey++, name, blocks: presetIds.map(id => makeBlock(findPreset(id))) })

/** One line under a block's title. */
export function describeBlock(block: Block): string {
  if (block.kind === 'pick') {
    return block.choices.join(' · ') || block.note.trim().slice(0, 60) || 'Nothing chosen yet'
  }
  return `${block.slots.length} exercises · ${block.rounds} ${block.rounds === 1 ? 'round' : 'rounds'}`
}

const state = reactive({
  sessions: seedSessions.map(s => makeSession(s.name, s.blocks)),
  /** The session the run and edit screens work on. */
  activeKey: 0,
  /** The block the block screens work on. */
  blockKey: 0,
})
state.activeKey = state.sessions[0]!.key
state.blockKey = state.sessions[0]!.blocks[0]!.key

export function useSession() {
  const session = computed(() => state.sessions.find(s => s.key === state.activeKey))
  const block = computed(() => session.value?.blocks.find(b => b.key === state.blockKey))

  function openSession(key: number) {
    const found = state.sessions.find(s => s.key === key)
    if (found) {
      state.activeKey = key
      state.blockKey = found.blocks[0]?.key ?? 0
    }
  }

  /** An empty session, opened for editing. */
  function newSession() {
    const created = makeSession(`Session ${state.sessions.length + 1}`, [])
    state.sessions.push(created)
    openSession(created.key)
  }

  function copySession(key: number) {
    const found = state.sessions.find(s => s.key === key)
    if (found) {
      state.sessions.push({ key: nextKey++, name: `${found.name} (copy)`, blocks: found.blocks.map(cloneBlock) })
    }
  }

  function deleteSession(key: number) {
    state.sessions = state.sessions.filter(s => s.key !== key)
  }

  function openBlock(key: number) {
    state.blockKey = key
  }

  function addBlock(presetId: string) {
    session.value?.blocks.push(makeBlock(findPreset(presetId)))
  }

  function removeBlock(key: number) {
    if (session.value) {
      session.value.blocks = session.value.blocks.filter(b => b.key !== key)
    }
  }

  function moveBlock(key: number, delta: -1 | 1) {
    const blocks = session.value?.blocks
    const from = blocks?.findIndex(b => b.key === key) ?? -1
    const to = from + delta
    if (!blocks || from < 0 || to < 0 || to >= blocks.length) {
      return
    }
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved!)
  }

  function clearTicks() {
    session.value?.blocks.forEach((b) => {
      b.done = false
    })
  }

  function addSlot(family: Family) {
    block.value?.slots.push(makeSlot(family))
  }

  function removeSlot(key: number) {
    if (block.value) {
      block.value.slots = block.value.slots.filter(s => s.key !== key)
    }
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
    if (block.value) {
      block.value.rounds = Math.min(5, Math.max(1, rounds))
    }
  }

  function addChoice(text: string) {
    if (block.value && text && !block.value.choices.includes(text)) {
      block.value.choices.push(text)
    }
  }

  function removeChoice(text: string) {
    if (block.value) {
      block.value.choices = block.value.choices.filter(c => c !== text)
    }
  }

  /** Back to the block's preset as it was (same place in the session, same tick). */
  function resetBlock() {
    const current = block.value
    if (current) {
      Object.assign(current, makeBlock(findPreset(current.presetId)), { key: current.key, done: current.done })
    }
  }

  return {
    sessions: computed(() => state.sessions),
    session,
    block,
    presets,
    openSession,
    newSession,
    copySession,
    deleteSession,
    openBlock,
    addBlock,
    removeBlock,
    moveBlock,
    clearTicks,
    addSlot,
    removeSlot,
    setProfile,
    setRounds,
    addChoice,
    removeChoice,
    resetBlock,
  }
}
