import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'
import { useRequestHeaders, useRequestURL } from '#imports'

export function createRequestAuthClient() {
  const requestUrl = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  return createAuthClient({
    baseURL: requestUrl.origin,
    fetchOptions: headers ? { headers } : undefined,
    plugins: [adminClient()],
  })
}
