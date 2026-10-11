import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, importKey } from '../supabase/functions/_shared/toplogger/crypto'
import { interpret, TopLoggerError, validTokens } from '../supabase/functions/_shared/toplogger/graphql'

const keyOf = (byte: number) => Buffer.alloc(32, byte).toString('base64')

describe('toplogger crypto', () => {
  it('round-trips and never stores plaintext', async () => {
    const key = await importKey(keyOf(1))
    const sealed = await encrypt(key, 'user-1', '{"refresh":"secret-token"}')
    expect(sealed).not.toContain('secret-token')
    expect(await decrypt(key, 'user-1', sealed)).toBe('{"refresh":"secret-token"}')
  })

  it('uses a fresh nonce each time', async () => {
    const key = await importKey(keyOf(1))
    expect(await encrypt(key, 'u', 'x')).not.toBe(await encrypt(key, 'u', 'x'))
  })

  it('refuses a ciphertext moved to another user', async () => {
    const key = await importKey(keyOf(1))
    const sealed = await encrypt(key, 'user-1', 'x')
    await expect(decrypt(key, 'user-2', sealed)).rejects.toThrow()
  })

  it('refuses the wrong key and tampering', async () => {
    const sealed = await encrypt(await importKey(keyOf(1)), 'u', 'x')
    await expect(decrypt(await importKey(keyOf(2)), 'u', sealed)).rejects.toThrow()
    const tampered = sealed.slice(0, -4) + (sealed.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    await expect(decrypt(await importKey(keyOf(1)), 'u', tampered)).rejects.toThrow()
  })

  it('rejects keys that are not 32 bytes', async () => {
    await expect(importKey('')).rejects.toThrow()
    await expect(importKey(Buffer.alloc(16).toString('base64'))).rejects.toThrow()
  })
})

describe('toplogger responses', () => {
  const kind = (fn: () => unknown) => {
    try {
      fn()
    }
    catch (e) {
      return e instanceof TopLoggerError ? e.kind : 'other'
    }
    return 'none'
  }

  it('returns data on success', () => {
    expect(interpret(200, { data: { userMe: { id: '1' } } })).toEqual({ userMe: { id: '1' } })
  })

  it('treats UNAUTHENTICATED (even on HTTP 200) and 401 as auth', () => {
    expect(kind(() => interpret(200, { errors: [{ extensions: { code: 'UNAUTHENTICATED' } }], data: null }))).toBe('auth')
    expect(kind(() => interpret(401, null))).toBe('auth')
  })

  it('treats 5xx as network and other failures as api', () => {
    expect(kind(() => interpret(503, null))).toBe('network')
    expect(kind(() => interpret(400, { errors: [{ extensions: { code: 'BAD_USER_INPUT' } }] }))).toBe('api')
    expect(kind(() => interpret(200, { data: null }))).toBe('api')
  })

  it('never echoes upstream messages', () => {
    try {
      interpret(400, { errors: [{ message: 'token abc.def.ghi leaked', extensions: { code: 'BAD_USER_INPUT' } }] })
    }
    catch (e) {
      expect((e as Error).message).not.toContain('abc.def.ghi')
    }
  })

  it('validates token pairs', () => {
    const ok = { access: { token: 'a', expiresAt: '2026-10-11T20:46:07.000Z' }, refresh: { token: 'r', expiresAt: '2026-10-25T20:36:07.000Z' } }
    expect(validTokens(ok)).toBe(true)
    expect(validTokens({ ...ok, refresh: { token: '', expiresAt: ok.refresh.expiresAt } })).toBe(false)
    expect(validTokens({ ...ok, access: { token: 'a', expiresAt: 'nope' } })).toBe(false)
    expect(validTokens(null)).toBe(false)
  })
})
