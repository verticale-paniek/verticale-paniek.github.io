import { createClient } from 'npm:@supabase/supabase-js@2'

let client: ReturnType<typeof createClient> | undefined

/** Service-role client (bypasses RLS). Server-side only; scope every query to the verified caller. */
export function adminClient() {
  client ??= createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
