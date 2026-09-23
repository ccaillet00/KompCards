import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  if (config.public.appMode === 'test') return
  if (config.public.appMode !== 'public') return

  const serviceUrl = String(config.public.serviceUrl).replace(/\/$/, '')
  return navigateTo(`${serviceUrl}${to.fullPath}`, { external: true })
})
