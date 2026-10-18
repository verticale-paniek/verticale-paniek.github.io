import { describe, expect, it } from 'vitest'
import { presets as circuitPresets } from '~/modules/training/useCircuit'
import { buildSteps, cueFor, families, getProfile, getTimer, positionAt, profiles, profilesFor, timers, totalSeconds } from '~/modules/training/plan'

describe('training profiles', () => {
  it('has unique ids and known timers', () => {
    expect(new Set(profiles.map(p => p.id)).size).toBe(profiles.length)
    expect(timers.map(t => t.id)).toEqual(['interval-7-3', 'interval-60-30', 'triple-20', 'hold-60', 'rest-120'])
    for (const profile of profiles) {
      if (profile.timer) {
        expect(getTimer(profile.timer), profile.id).toBeDefined()
      }
      expect(profile.options.length, profile.id).toBeGreaterThan(0)
    }
  })

  it('offers every family at least one profile', () => {
    for (const family of families) {
      expect(profilesFor(family.id).length, family.id).toBeGreaterThan(0)
    }
    expect(getProfile('nope')).toBeUndefined()
  })
})

describe('circuit presets', () => {
  it('only pick existing options of a profile in the right family', () => {
    for (const preset of circuitPresets) {
      expect(preset.picks.length, preset.id).toBeGreaterThan(0)
      for (const pick of preset.picks) {
        const profile = getProfile(pick.profileId)
        expect(profile?.family, pick.profileId).toBe(pick.family)
        expect(profile?.options, pick.option).toContain(pick.option)
      }
    }
  })

  it('has the strength circuit (six slots) and a chained abs circuit (ten slots)', () => {
    const [strength, abs] = circuitPresets
    expect(strength!.picks.map(p => p.family)).toEqual(['fingers', 'core', 'strength', 'fingers', 'core', 'strength'])
    expect(strength!.chain).toBe(false)
    expect(abs!.picks).toHaveLength(10)
    expect(abs!.chain).toBe(true)
  })
})

describe('timer steps', () => {
  const interval = getTimer('interval-7-3')!

  it('starts with a lead-in, then the phases repeated', () => {
    const steps = buildSteps(interval)
    expect(steps).toHaveLength(16)
    expect(steps[0]).toMatchObject({ label: 'Get ready', seconds: 5, kind: 'ready' })
    expect(steps[1]).toEqual({ label: 'Go', seconds: 7, kind: 'work', pass: 1, passes: 8 })
    expect(steps[2]).toMatchObject({ label: 'Rest', seconds: 3, kind: 'rest' })
    expect(totalSeconds(steps)).toBe(82)
    expect(steps.at(-1)).toMatchObject({ label: 'Go', pass: 8 }) // the last rest is dropped
  })

  it('has no lead-in on the 2 min rest, which ends by getting ready', () => {
    const steps = buildSteps(getTimer('rest-120')!)
    expect(steps.map(s => s.kind)).toEqual(['rest', 'ready'])
    expect(totalSeconds(steps)).toBe(120)
    expect(totalSeconds(buildSteps(getTimer('triple-20')!))).toBe(65)
    expect(totalSeconds(buildSteps(getTimer('hold-60')!))).toBe(65)
  })

  it('chains timers: the lead-in only at the start, the rest kept unless it is the last', () => {
    const abs = getTimer('interval-60-30')!
    const shape = (steps: ReturnType<typeof buildSteps>) => steps.map(s => `${s.kind}:${s.seconds}`)
    expect(shape(buildSteps(abs))).toEqual(['ready:5', 'work:60'])
    expect(shape(buildSteps(abs, { leadIn: false, keepRest: true }))).toEqual(['work:60', 'rest:30'])
    expect(shape(buildSteps(abs, { leadIn: false }))).toEqual(['work:60'])
    expect(shape(buildSteps(abs, { keepRest: true }))).toEqual(['ready:5', 'work:60', 'rest:30'])
  })

  it('finds the position for an elapsed time', () => {
    const steps = buildSteps(interval)
    expect(positionAt(steps, 0)).toEqual({ index: 0, remaining: 5, done: false })
    expect(positionAt(steps, 4500)).toEqual({ index: 0, remaining: 1, done: false })
    expect(positionAt(steps, 5000)).toEqual({ index: 1, remaining: 7, done: false })
    expect(positionAt(steps, 12000)).toEqual({ index: 2, remaining: 3, done: false })
    expect(positionAt(steps, 82000)).toEqual({ index: 16, remaining: 0, done: true })
    expect(positionAt(steps, -5)).toEqual({ index: 0, remaining: 5, done: false })
  })

  it('cues ticks, phase changes and the end', () => {
    const steps = buildSteps(interval)
    const at = (ms: number) => positionAt(steps, ms)
    expect(cueFor(null, at(0))).toBeNull()
    expect(cueFor(at(0), at(500))).toBeNull()
    expect(cueFor(at(1900), at(2000))).toBe('tick') // 3 s left of the lead-in
    expect(cueFor(at(2000), at(2100))).toBeNull()
    expect(cueFor(at(4900), at(5000))).toBe('phase')
    expect(cueFor(at(5000), at(6000))).toBeNull() // 6 s left of Go
    expect(cueFor(at(8900), at(9000))).toBe('tick') // 3 s left of Go
    expect(cueFor(at(81900), at(82000))).toBe('done')
    expect(cueFor(at(82000), at(83000))).toBeNull()
  })
})
