import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { isAdminUser, passwordError } from '~/shell/auth'

const user = (app_metadata: Record<string, unknown>) => ({ app_metadata }) as unknown as User

describe('isAdminUser', () => {
  it('is true only for app_metadata.role = admin', () => {
    expect(isAdminUser(user({ role: 'admin' }))).toBe(true)
    expect(isAdminUser(user({ role: 'member' }))).toBe(false)
    expect(isAdminUser(user({}))).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })
})

describe('passwordError', () => {
  it('requires a minimum length and a matching confirmation', () => {
    expect(passwordError('short', 'short')).toMatch(/at least/)
    expect(passwordError('long-enough', 'different')).toMatch(/match/)
    expect(passwordError('long-enough', 'long-enough')).toBeNull()
  })
})
