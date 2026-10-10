import type { User } from '@supabase/supabase-js'

export const MIN_PASSWORD_LENGTH = 8

/** The admin role lives in `app_metadata`, which users cannot edit themselves. */
export function isAdminUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin'
}

/** Returns an error message, or null when the password is acceptable. */
export function passwordError(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password !== confirm) return 'The two passwords do not match.'
  return null
}
