import { ref } from 'vue'
import { createRequestAuthClient } from '../lib/authClient'
import { useAuth } from './useAuth'

export interface AdminUser {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

function resultError(result: { error?: { message?: string } | null }): Error | null {
  return result.error ? new Error(result.error.message ?? 'Admin-Aktion fehlgeschlagen.') : null
}

export function useAdminUsers() {
  const client = createRequestAuthClient()
  const auth = useAuth()
  const users = ref<AdminUser[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function execute(action: () => Promise<{ error?: { message?: string } | null }>): Promise<void> {
    error.value = null
    const result = await action()
    if (result.error) auth.handleUnauthorized(result.error)
    const failure = resultError(result)
    if (failure) {
      error.value = failure.message
      throw failure
    }
  }

  async function load(page = 1): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await client.admin.listUsers({
        query: { limit: 100, ...(page > 1 ? { offset: (page - 1) * 100 } : {}), sortBy: 'name', sortDirection: 'asc' },
      })
      if (result.error) auth.handleUnauthorized(result.error)
      const failure = resultError(result)
      if (failure) throw failure
      users.value = (result.data?.users ?? []) as AdminUser[]
      total.value = result.data?.total ?? 0
    } catch (requestError) {
      auth.handleUnauthorized(requestError)
      error.value = requestError instanceof Error
        ? requestError.message
        : 'Benutzer konnten nicht geladen werden.'
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  async function setRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    await execute(() => client.admin.setRole({ userId, role }))
    const user = users.value.find(candidate => candidate.id === userId)
    if (user) user.role = role
  }

  async function setBanned(userId: string, banned: boolean): Promise<void> {
    if (banned) {
      await execute(() => client.admin.banUser({
        userId,
        banReason: 'Durch KompCards-Administration gesperrt',
      }))
    } else {
      await execute(() => client.admin.unbanUser({ userId }))
    }
    const user = users.value.find(candidate => candidate.id === userId)
    if (user) user.banned = banned
  }

  async function revokeSessions(userId: string): Promise<void> {
    await execute(() => client.admin.revokeUserSessions({ userId }))
  }

  async function setPassword(userId: string, newPassword: string): Promise<void> {
    await execute(() => client.admin.setUserPassword({ userId, newPassword }))
    await revokeSessions(userId)
  }

  return {
    users,
    total,
    isLoading,
    error,
    load,
    setRole,
    setBanned,
    revokeSessions,
    setPassword,
  }
}
