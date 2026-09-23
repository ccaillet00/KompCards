import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports'

export default defineNuxtRouteMiddleware(() => {
  const config = useRuntimeConfig()
  if (config.public.appMode === 'test') return
  if (config.public.appMode !== 'service') return

  return navigateTo('/dashboard')
})
