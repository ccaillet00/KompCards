import { computed, ref } from 'vue'
import { useRuntimeConfig, useState } from '#imports'
import { $fetch } from 'ofetch'
import type {
  AuthUser,
  LoginInput,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
} from '../types/auth'

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
  const user = useState<AuthUser | null>('auth.user', () => null)
  const expiresAt = useState<number | null>('auth.expiresAt', () => null)
  const initialized = useState('auth.initialized', () => false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function clearSession(): void {
    user.value = null
    expiresAt.value = null
  }

  async function restoreSession(force = false): Promise<void> {
    if (initialized.value && !force) return
    try {
      const response = await $fetch<MeResponse>(`${config.public.apiBase}/auth/me`, {
        credentials: 'include',
      })
      user.value = response.user
      expiresAt.value = response.expiresAt
    } catch {
      clearSession()
    } finally {
      initialized.value = true
    }
  }

  async function login(input: LoginInput): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<LoginResponse>(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body: input,
        credentials: 'include',
      })
      user.value = response.user
      expiresAt.value = Date.now() + response.expiresInSeconds * 1000
      initialized.value = true
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
    isLoading.value = true
    error.value = null
    try {
      await $fetch<void>(`${config.public.apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (requestError) {
      error.value = apiErrorMessage(requestError)
    } finally {
      clearSession()
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
  }
}
