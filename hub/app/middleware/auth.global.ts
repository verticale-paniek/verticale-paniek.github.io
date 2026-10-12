export default defineNuxtRouteMiddleware((to) => {
  const { user, isAdmin } = useAuth()
  const isAuthRoute = to.path.startsWith('/auth/')

  if (!user.value && !isAuthRoute) {
    return navigateTo('/auth/login')
  }
  if (user.value && to.path === '/auth/login') {
    return navigateTo('/')
  }
  if (to.path === '/admin' && !isAdmin.value) {
    return navigateTo('/')
  }
})
