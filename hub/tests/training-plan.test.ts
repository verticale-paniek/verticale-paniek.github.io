import { describe, expect, it } from 'vitest'
import { buildSteps, families, getProfile, getTimer, positionAt, profiles, profilesFor, timers, totalSeconds } from '~/modules/training/plan'

describe('training profiles', () => {
  it('has unique ids and known timers', () => {
    expect(new Set(profiles.map(p => p.id)).size).toBe(profiles.length)
    expect(timers.map(t => t.id)).toEqual(['interval-7-3', 'triple-20', 'hold-60', 'rest-120'])
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

describe('timer steps', () => {
  const interval = getTimer('interval-7-3')!
  const triple = getTimer('triple-20')!

  it('flattens phases and repeats', () => {
    const steps = buildSteps(interval)
    expect(steps).toHaveLength(16)
    expect(totalSeconds(steps)).toBe(80)
    expect(steps[0]).toEqual({ label: 'On', seconds: 7, pass: 1, passes: 8 })
    expect(totalSeconds(buildSteps(triple))).toBe(60)
    expect(totalSeconds(buildSteps(getTimer('rest-120')!))).toBe(120)
  })

  it('finds the position for an elapsed time', () => {
    const steps = buildSteps(interval)
    expect(positionAt(steps, 0)).toEqual({ index: 0, remaining: 7, done: false })
    expect(positionAt(steps, 6500)).toEqual({ index: 0, remaining: 1, done: false })
    expect(positionAt(steps, 7000)).toEqual({ index: 1, remaining: 3, done: false })
    expect(positionAt(steps, 10000)).toEqual({ index: 2, remaining: 7, done: false })
    expect(positionAt(steps, 80000)).toEqual({ index: 16, remaining: 0, done: true })
    expect(positionAt(steps, -5)).toEqual({ index: 0, remaining: 7, done: false })
  })
})
