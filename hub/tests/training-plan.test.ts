import { describe, expect, it } from 'vitest'
import { circuits, getCircuit, getTimer, timers } from '~/modules/training/plan'

describe('training circuits', () => {
  it('has unique circuit and timer ids', () => {
    expect(new Set(circuits.map(c => c.id)).size).toBe(circuits.length)
    expect(new Set(timers.map(t => t.id)).size).toBe(timers.length)
    expect(getCircuit('phase-1')?.rounds).toBe(2)
    expect(getCircuit('nope')).toBeUndefined()
  })

  it('has slots with a label, text and a known timer when timed', () => {
    for (const circuit of circuits) {
      expect(circuit.slots.length, circuit.id).toBeGreaterThan(0)
      for (const slot of circuit.slots) {
        expect(slot.label.length).toBeGreaterThan(0)
        expect(slot.text.length).toBeGreaterThan(0)
        if (slot.timer) {
          expect(getTimer(slot.timer), `${circuit.id}: ${slot.timer}`).toBeDefined()
        }
      }
    }
  })

  it('defines the timer types', () => {
    expect(timers.map(t => t.id)).toEqual(['interval-7-3', 'triple-20', 'hold-60', 'rest-120'])
  })
})
