import { modules } from '~/shell/modules'

const KEY = 'vp:lastModule'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  }
  catch {
    return null
  }
}

function write(id: string) {
  try {
    localStorage.setItem(KEY, id)
  }
  catch {
    // storage can be blocked; resuming is a convenience only
  }
}

// Remembers the last opened module and reopens it on app launch (the first
// navigation of a page load), so tapping Home later still reaches the launcher.
export default defineNuxtPlugin(() => {
  let launched = false

  addRouteMiddleware('last-module', (to) => {
    const id = to.path.split('/')[1] ?? ''
    const isModule = modules.some(m => m.id === id)

    if (isModule) {
      write(id)
    }

    if (launched || to.path.startsWith('/auth/')) {
      return
    }
    launched = true

    if (to.path === '/') {
      const last = read()
      if (last && modules.some(m => m.id === last)) {
        return navigateTo(`/${last}`, { replace: true })
      }
    }
  }, { global: true })
})
