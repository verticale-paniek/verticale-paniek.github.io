import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  email: string | null
  role: string | null
  created_at: string
  last_sign_in_at: string | null
  confirmed: boolean
  banned: boolean
}

export type AdminRequest
  = | { action: 'list' }
    | { action: 'invite', email: string }
    | { action: 'link', id: string }
    | { action: 'set-banned', id: string, banned: boolean }
    | { action: 'delete', id: string }

/** Calls the admin-users Edge Function, surfacing its error message when it sends one. */
export async function adminCall<T>(supabase: SupabaseClient, body: AdminRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let message = error.message
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const payload = await context.json().catch(() => null)
      if (payload?.error) {
        message = payload.error
      }
    }
    throw new Error(message)
  }
  return data as T
}

/** Pre-filled WhatsApp message (opens WhatsApp's contact picker). */
export function whatsappShareUrl(link: string, kind: 'invite' | 'link'): string {
  const intro = kind === 'invite'
    ? 'You are invited to Verticale Paniek! Open this link to choose your password:'
    : 'Here is your new link for Verticale Paniek. Open it to choose a new password:'
  return `https://wa.me/?text=${encodeURIComponent(`${intro}\n${link}`)}`
}
