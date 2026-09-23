import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
import { defineComponent } from 'vue'
import { $fetch } from 'ofetch'
import { useAuth } from '../composables/useAuth'

vi.mock('ofetch', () => ({ $fetch: vi.fn() }))

const Harness = defineComponent({
  setup() {
    return useAuth()
  },
  template: '<div />',
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.mocked($fetch).mockReset()
    clearNuxtState()
  })

  it('stellt die Sitzung über den HttpOnly-Cookie wieder her', async () => {
    vi.mocked($fetch).mockResolvedValue({
      expiresAt: Date.now() + 60_000,
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    })
    const wrapper = await mountSuspended(Harness)
    await (wrapper.vm as unknown as { restoreSession: () => Promise<void> }).restoreSession()

    expect($fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' })
    expect((wrapper.vm as unknown as { user: { id: string } }).user.id).toBe('user-1')
  })

  it('verwendet den vorhandenen Login-Endpunkt und übernimmt den Nutzer', async () => {
    vi.mocked($fetch).mockResolvedValue({
      expiresInSeconds: 3600,
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    })
    const wrapper = await mountSuspended(Harness)

    await (wrapper.vm as unknown as { login: (input: { email: string, password: string }) => Promise<void> }).login({
      email: 'ada@example.ch',
      password: 'geheim123',
    })

    expect($fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'ada@example.ch', password: 'geheim123' },
      credentials: 'include',
    })
    expect((wrapper.vm as unknown as { user: { id: string } }).user.id).toBe('user-1')
  })

  it('verwendet den vorhandenen Registrierungsendpunkt', async () => {
    vi.mocked($fetch).mockResolvedValue({
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    })
    const wrapper = await mountSuspended(Harness)
    const input = { name: 'Ada', email: 'ada@example.ch', password: 'geheim123' }

    await (wrapper.vm as unknown as { register: (value: typeof input) => Promise<void> }).register(input)

    expect($fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      body: input,
    })
  })

  it('meldet die bestehende Sitzung serverseitig ab und entfernt sie lokal', async () => {
    vi.mocked($fetch).mockResolvedValue(undefined)
    const wrapper = await mountSuspended(Harness)
    const auth = wrapper.vm as unknown as {
      logout: () => Promise<void>
      user: { id: string } | null
    }

    await auth.logout()

    expect($fetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    expect(auth.user).toBeNull()
  })
})
