import type { User } from '@supabase/supabase-js'
import { isAdminUser } from '~/shell/auth'

export function useAuth() {
  const user = useState<User | null>('auth-user', () => null)
  const isAdmin = computed(() => isAdminUser(user.value))

  async function signOut() {
    await useSupabase().auth.signOut()
    await navigateTo('/auth/login')
  }

  return { user, isAdmin, signOut }
}
