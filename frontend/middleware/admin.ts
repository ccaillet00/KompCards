import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuth } from '../composables/useAuth'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuth()
  const roles = auth.user.value?.role?.split(',').map(role => role.trim()) ?? []
  if (!roles.includes('admin')) return navigateTo('/dashboard')
})
