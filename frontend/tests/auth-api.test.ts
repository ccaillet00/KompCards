import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
import { defineComponent } from 'vue'
import { useAuth } from '../composables/useAuth'

const client = vi.hoisted(() => ({
  getSession: vi.fn(),
  signIn: { email: vi.fn(), social: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}))

const fetchConfig = vi.hoisted(() => vi.fn())
vi.mock('ofetch', () => ({ $fetch: fetchConfig }))

vi.mock('../lib/authClient', () => ({
  createRequestAuthClient: () => client,
}))

const Harness = defineComponent({
  setup() {
    return useAuth()
  },
  template: '<div />',
})

describe('useAuth', () => {
  beforeEach(() => {
    fetchConfig.mockReset()
    client.signIn.social.mockReset()
    client.getSession.mockReset()
    client.signIn.email.mockReset()
    client.signUp.email.mockReset()
    client.signOut.mockReset()
    clearNuxtState()
  })

  it('lädt GitHub-Verfügbarkeit vom Backend und bleibt bei Fehlern deaktiviert', async () => {
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as { loadAuthMethods: () => Promise<void>, githubEnabled: boolean }
    fetchConfig.mockResolvedValue({ github: true })
    await auth.loadAuthMethods()
    expect(fetchConfig).toHaveBeenCalledWith('/api/auth-config')
    expect(auth.githubEnabled).toBe(true)
    fetchConfig.mockRejectedValue(new Error('offline'))
    await auth.loadAuthMethods()
    expect(auth.githubEnabled).toBe(false)
  })

  it.each(['login', 'register'] as const)('startet GitHub %s mit festen Rücksprungzielen und explizitem Registrierungsmodus', async (mode) => {
    client.signIn.social.mockResolvedValue({ data: { url: 'https://github.com/login/oauth/authorize' }, error: null })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as { signInWithGithub: (mode: 'login' | 'register') => Promise<void> }
    await auth.signInWithGithub(mode)
    expect(client.signIn.social).toHaveBeenCalledWith({
      provider: 'github', callbackURL: '/dashboard',
      errorCallbackURL: mode === 'register' ? '/login?mode=register' : '/login',
      requestSignUp: mode === 'register',
    })
    expect(client.getSession).not.toHaveBeenCalled()
  })

  it('übersetzt GitHub-Startfehler und gibt den Ladezustand wieder frei', async () => {
    client.signIn.social.mockResolvedValue({ data: null, error: { code: 'PROVIDER_NOT_FOUND', message: 'raw provider failure' } })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as { signInWithGithub: (mode: 'login') => Promise<void>, error: string, isLoading: boolean }
    await expect(auth.signInWithGithub('login')).rejects.toThrow()
    expect(auth.error).toContain('GitHub')
    expect(auth.error).not.toContain('raw provider failure')
    expect(auth.isLoading).toBe(false)
  })

  it('stellt die Sitzung über den HttpOnly-Cookie wieder her', async () => {
    client.getSession.mockResolvedValue({ data: {
      session: { expiresAt: new Date(Date.now() + 60_000) },
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
    }, error: null })
    const wrapper = await mountSuspended(Harness)
    await (wrapper.vm as unknown as { restoreSession: () => Promise<void> }).restoreSession()

    expect(client.getSession).toHaveBeenCalled()
    expect((wrapper.vm as unknown as { user: { id: string } }).user.id).toBe('user-1')
  })

  it('verwendet Better Auth für Login und übernimmt danach die DB-Session', async () => {
    client.signIn.email.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    client.getSession.mockResolvedValue({ data: {
      session: { expiresAt: new Date(Date.now() + 60_000) },
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
    }, error: null })
    const wrapper = await mountSuspended(Harness)

    await (wrapper.vm as unknown as { login: (input: { email: string, password: string }) => Promise<void> }).login({
      email: 'ada@example.ch',
      password: 'geheim123',
    })

    expect(client.signIn.email).toHaveBeenCalledWith({
      email: 'ada@example.ch', password: 'geheim123',
    })
    expect((wrapper.vm as unknown as { user: { id: string } }).user.id).toBe('user-1')
  })

  it('verwendet Better Auth für die Registrierung ohne Auto-Login', async () => {
    client.signUp.email.mockResolvedValue({ data: {
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    }, error: null })
    const wrapper = await mountSuspended(Harness)
    const input = { name: 'Ada', email: 'ada@example.ch', password: 'geheim123' }

    await (wrapper.vm as unknown as { register: (value: typeof input) => Promise<void> }).register(input)

    expect(client.signUp.email).toHaveBeenCalledWith(input)
  })

  it('meldet die bestehende Sitzung serverseitig ab und entfernt sie lokal', async () => {
    client.signOut.mockResolvedValue({ data: { success: true }, error: null })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      logout: () => Promise<void>
      user: { id: string } | null
    }

    await auth.logout()

    expect(client.signOut).toHaveBeenCalled()
    expect(auth.user).toBeNull()
  })

  it('behält den lokalen Auth-State bei einem fehlgeschlagenen Logout', async () => {
    client.getSession.mockResolvedValue({ data: {
      session: { expiresAt: new Date(Date.now() + 60_000) },
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
    }, error: null })
    client.signOut.mockResolvedValue({ data: null, error: { message: 'Netzwerkfehler', status: 500 } })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      restoreSession: () => Promise<void>
      logout: () => Promise<void>
      user: { id: string } | null
    }
    await auth.restoreSession()

    await expect(auth.logout()).rejects.toThrow('Netzwerkfehler')
    expect(auth.user?.id).toBe('user-1')
  })

  it('entfernt eine lokal abgelaufene Sitzung bei einer 401-Logout-Antwort', async () => {
    client.getSession.mockResolvedValue({ data: {
      session: { expiresAt: new Date(Date.now() + 60_000) },
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
    }, error: null })
    client.signOut.mockResolvedValue({ data: null, error: { message: 'Unauthorized', status: 401 } })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      restoreSession: () => Promise<void>
      logout: () => Promise<void>
      user: { id: string } | null
    }
    await auth.restoreSession()

    await auth.logout()

    expect(auth.user).toBeNull()
  })

  it('behält eine bekannte Sitzung bei einem vorübergehenden Restore-Fehler', async () => {
    client.getSession
      .mockResolvedValueOnce({ data: {
        session: { expiresAt: new Date(Date.now() + 60_000) },
        user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
      }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Backend nicht erreichbar', status: 503 } })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      restoreSession: (force?: boolean) => Promise<void>
      user: { id: string } | null
    }

    await auth.restoreSession()
    await auth.restoreSession(true)

    expect(auth.user?.id).toBe('user-1')
  })

  it('löscht den lokalen Auth-State bei einer 401-Antwort', async () => {
    client.getSession.mockResolvedValue({ data: {
      session: { expiresAt: new Date(Date.now() + 60_000) },
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch', role: 'user' },
    }, error: null })
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      restoreSession: () => Promise<void>
      handleUnauthorized: (error: unknown) => boolean
      user: { id: string } | null
    }
    await auth.restoreSession()

    expect(auth.handleUnauthorized({ response: { status: 401 } })).toBe(true)
    expect(auth.user).toBeNull()
    expect(auth.handleUnauthorized({ response: { status: 403 } })).toBe(false)
  })
})
