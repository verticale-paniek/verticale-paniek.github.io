// AES-256-GCM for the stored TopLogger token bundle. The user id is bound as additional authenticated
// data, so a ciphertext copied onto another user's row fails to decrypt.
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0))

/** Imports a base64 encoded 32-byte key (the TOPLOGGER_ENCRYPTION_KEY secret). */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  let raw: Uint8Array
  try {
    raw = fromBase64(base64Key.trim())
  }
  catch {
    raw = new Uint8Array()
  }
  if (raw.length !== 32) throw new Error('TOPLOGGER_ENCRYPTION_KEY must be 32 bytes, base64 encoded')
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encrypt(key: CryptoKey, aad: string, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(aad) },
    key,
    encoder.encode(plaintext),
  ))
  const out = new Uint8Array(iv.length + ciphertext.length)
  out.set(iv)
  out.set(ciphertext, iv.length)
  return toBase64(out)
}

export async function decrypt(key: CryptoKey, aad: string, payload: string): Promise<string> {
  const bytes = fromBase64(payload)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: encoder.encode(aad) },
    key,
    bytes.slice(12),
  )
  return decoder.decode(plain)
}
