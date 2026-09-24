import { computed, ref } from 'vue'
import { navigateTo, useState } from '#imports'
import { createRequestAuthClient } from '../lib/authClient'
import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from '../types/auth'

function authErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
}

function authError(result: { error?: unknown | null }): Error | null {
  if (!result.error) return null
  const error = new Error(authErrorMessage(result.error)) as Error & { status?: number }
  if (typeof result.error === 'object' && result.error !== null && 'status' in result.error) {
    const status = (result.error as { status?: unknown }).status
    if (typeof status === 'number') error.status = status
  }
  return error
}

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
  }
  if (typeof candidate.status === 'number') return candidate.status
  if (typeof candidate.statusCode === 'number') return candidate.statusCode
  return typeof candidate.response?.status === 'number' ? candidate.response.status : undefined
}

export function useAuth() {
  const client = createRequestAuthClient()
  const user = useState<AuthUser | null>('auth.user', () => null)
  const expiresAt = useState<number | null>('auth.expiresAt', () => null)
  const initialized = useState('auth.initialized', () => false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function clearSession(): void {
    user.value = null
    expiresAt.value = null
  }

  function handleUnauthorized(requestError: unknown): boolean {
    if (responseStatus(requestError) !== 401) return false
    clearSession()
    initialized.value = true
    void navigateTo('/login')
    return true
  }

  async function restoreSession(force = false): Promise<void> {
    if (initialized.value && !force) return
    try {
      const result = await client.getSession()
      const requestError = authError(result)
      if (requestError) throw requestError
      if (!result.data?.user || !result.data.session) {
        clearSession()
        return
      }
      user.value = result.data.user as AuthUser
      expiresAt.value = new Date(result.data.session.expiresAt).getTime()
    } catch (requestError) {
      handleUnauthorized(requestError)
      error.value = authErrorMessage(requestError)
    } finally {
      initialized.value = true
    }
  }

  async function login(input: LoginInput): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await client.signIn.email(input)
      const requestError = authError(result)
      if (requestError) throw requestError
      initialized.value = false
      await restoreSession(true)
      if (!user.value) throw new Error('Die Sitzung konnte nach der Anmeldung nicht geladen werden.')
    } catch (requestError) {
      error.value = authErrorMessage(requestError)
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  async function register(input: RegisterInput): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await client.signUp.email(input)
      const requestError = authError(result)
      if (requestError) throw requestError
    } catch (requestError) {
      error.value = authErrorMessage(requestError)
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await client.signOut()
      const requestError = authError(result)
      if (requestError) throw requestError
      clearSession()
      initialized.value = true
    } catch (requestError) {
      error.value = authErrorMessage(requestError)
      if (handleUnauthorized(requestError)) return
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    expiresAt,
    initialized,
    isLoading,
    error,
    isAuthenticated: computed(() => Boolean(user.value && expiresAt.value && expiresAt.value > Date.now())),
    restoreSession,
    login,
    register,
    logout,
    clearSession,
    handleUnauthorized,
  }
}
