import { createClient, type User } from '@supabase/supabase-js'

export default defineNuxtPlugin(async () => {
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set when building (see hub/.env.example)')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    // Hash routing owns the URL fragment, so the client must not parse tokens out of it.
    // Invite and reset links are handled explicitly by /auth/confirm (token_hash + verifyOtp).
    auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
  })

  const user = useState<User | null>('auth-user', () => null)
  try {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
  }
  catch {
    user.value = null
  }
  // Keep this callback synchronous: awaiting other supabase calls inside it can deadlock.
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
  })

  return { provide: { supabase } }
})
