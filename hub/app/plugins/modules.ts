import { modules } from '~/shell/modules'
import { moduleRoutes } from '~/shell/registry'

export default defineNuxtPlugin((nuxtApp) => {
  const router = nuxtApp.$router as ReturnType<typeof useRouter>
  for (const manifest of modules) {
    for (const route of moduleRoutes(manifest)) {
      router.addRoute(route)
    }
  }
})
