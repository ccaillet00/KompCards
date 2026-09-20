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
    sessionStorage.clear()
  })

  it('stellt eine noch gültige Sitzung nach einem Neuladen wieder her', async () => {
    sessionStorage.setItem('kompcards.auth', JSON.stringify({
      token: 'stored-token',
      expiresAt: Date.now() + 60_000,
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    }))

    const wrapper = await mountSuspended(Harness)

    expect((wrapper.vm as unknown as { token: string | null }).token).toBe('stored-token')
  })

  it('verwendet den vorhandenen Login-Endpunkt und speichert die Sitzung', async () => {
    vi.mocked($fetch).mockResolvedValue({
      token: 'jwt-token',
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
    })
    expect(sessionStorage.getItem('kompcards.auth')).toContain('jwt-token')
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
})
