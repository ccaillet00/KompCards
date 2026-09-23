import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '../composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const auth = useAuth()
  await auth.restoreSession(true)
  if (!auth.isAuthenticated.value) return navigateTo('/login')
})
