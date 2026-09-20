import { computed, ref } from 'vue'
import { useRuntimeConfig, useState } from '#imports'
import { $fetch } from 'ofetch'
import type {
  AuthUser,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  StoredAuthSession,
} from '../types/auth'

const SESSION_KEY = 'kompcards.auth'

function readStoredSession(): StoredAuthSession | null {
  if (!import.meta.client) return null

  const value = sessionStorage.getItem(SESSION_KEY)
  if (!value) return null

  try {
    const session = JSON.parse(value) as Partial<StoredAuthSession>
    const hasUser = typeof session.user === 'object'
      && session.user !== null
      && typeof session.user.id === 'string'
      && typeof session.user.name === 'string'
      && typeof session.user.email === 'string'

    if (typeof session.token !== 'string' || typeof session.expiresAt !== 'number' || !hasUser) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    if (session.expiresAt <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session as StoredAuthSession
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function apiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error
      if (typeof message === 'string') return message
    }
  }
  return 'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
}

export function useAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('auth.token', () => null)
  const user = useState<AuthUser | null>('auth.user', () => null)
  const expiresAt = useState<number | null>('auth.expiresAt', () => null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  if (!token.value) {
    const storedSession = readStoredSession()
    if (storedSession) {
      token.value = storedSession.token
      user.value = storedSession.user
      expiresAt.value = storedSession.expiresAt
    }
  }

  function persistSession(session: StoredAuthSession): void {
    token.value = session.token
    user.value = session.user
    expiresAt.value = session.expiresAt
    if (import.meta.client) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  function clearSession(): void {
    token.value = null
    user.value = null
    expiresAt.value = null
    if (import.meta.client) sessionStorage.removeItem(SESSION_KEY)
  }

  async function login(input: LoginInput): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<LoginResponse>(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body: input,
      })
      persistSession({
        token: response.token,
        user: response.user,
        expiresAt: Date.now() + response.expiresInSeconds * 1000,
      })
    } catch (requestError) {
      error.value = apiErrorMessage(requestError)
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  async function register(input: RegisterInput): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch<RegisterResponse>(`${config.public.apiBase}/auth/register`, {
        method: 'POST',
        body: input,
      })
    } catch (requestError) {
      error.value = apiErrorMessage(requestError)
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    const currentToken = token.value
    isLoading.value = true
    error.value = null
    try {
      if (currentToken) {
        await $fetch<void>(`${config.public.apiBase}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        })
      }
    } catch (requestError) {
      error.value = apiErrorMessage(requestError)
    } finally {
      clearSession()
      isLoading.value = false
    }
  }

  return {
    token,
    user,
    expiresAt,
    isLoading,
    error,
    isAuthenticated: computed(() => Boolean(token.value && expiresAt.value && expiresAt.value > Date.now())),
    login,
    register,
    logout,
    clearSession,
  }
}
