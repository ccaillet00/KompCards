import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '../composables/useAuth'

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const auth = useAuth()
  if (auth.isAuthenticated.value) return navigateTo('/dashboard')
})
