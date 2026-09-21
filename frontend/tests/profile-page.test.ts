import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfilePage from '../pages/profile.vue'

const fixture = vi.hoisted(() => ({
  user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.ch' },
  expiresAt: new Date('2026-09-21T08:00:00.000Z').getTime(),
  error: null as string | null,
  logout: vi.fn(),
}))

vi.mock('../composables/useAuth', async () => {
  const { ref } = await import('vue')
  return {
    useAuth: () => ({
      user: ref(fixture.user),
      expiresAt: ref(fixture.expiresAt),
      isAuthenticated: ref(true),
      isLoading: ref(false),
      error: ref(fixture.error),
      logout: fixture.logout,
    }),
  }
})

describe('Profil', () => {
  beforeEach(() => {
    fixture.logout.mockReset().mockResolvedValue(undefined)
    fixture.error = null
  })

  it('zeigt die Daten der bestehenden Sitzung ohne nicht unterstützte Bearbeitungsformulare', async () => {
    const wrapper = await mountSuspended(ProfilePage, { route: '/profile' })

    expect(wrapper.get('h1').text()).toBe('Dein Profil')
    expect(wrapper.get('[data-test="page-artwork"] img').classes()).toContain('fox-world-page-image')
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada@example.ch')
    expect(wrapper.text()).toContain('Profiländerungen sind derzeit noch nicht verfügbar')
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('meldet den Benutzer ab und führt zur Anmeldung zurück', async () => {
    const wrapper = await mountSuspended(ProfilePage, { route: '/profile' })
    const push = vi.spyOn(wrapper.vm.$router, 'push')

    await wrapper.get('[data-test="logout"]').trigger('click')
    await flushPromises()

    expect(fixture.logout).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith('/login')
  })
})
