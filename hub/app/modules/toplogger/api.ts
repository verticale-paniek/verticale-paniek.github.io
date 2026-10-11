import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConnectionState {
  connected: boolean
  status: 'connected' | 'reconnect_required' | 'not_connected'
  refreshExpiresAt?: string
  lastError?: string | null
  /** When the connection was last connected or refreshed (or last failed). */
  updatedAt?: string
}

export interface Profile {
  id: string
  fullName: string
  gym: { id: string, name: string } | null
  gymUserFavorites: { gym: { id: string, name: string } }[]
}

export type TopLoggerRequest
  = | { action: 'status' }
    | { action: 'connect', refreshToken: string }
    | { action: 'disconnect' }
    | { action: 'profile' }

/** Error from the toplogger function; `code` is e.g. not_connected, reconnect_required, invalid_token. */
export class TopLoggerApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
  }
}

/** Calls the toplogger Edge Function, surfacing its error message and code when it sends them. */
export async function toploggerCall<T>(supabase: SupabaseClient, body: TopLoggerRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('toplogger', { body })
  if (error) {
    let message = error.message
    let code: string | undefined
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const payload = await context.json().catch(() => null)
      if (payload?.error) message = payload.error
      code = payload?.code
    }
    throw new TopLoggerApiError(message, code)
  }
  return data as T
}
