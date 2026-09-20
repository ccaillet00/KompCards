import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LoginPage from '../pages/login.vue'

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  isLoading: { value: false },
  error: { value: null as string | null },
  isAuthenticated: { value: false },
}))

vi.mock('../composables/useAuth', () => ({
  useAuth: () => auth,
}))

describe('Authentifizierungsseiten', () => {
  beforeEach(() => {
    auth.login.mockReset()
    auth.register.mockReset()
    auth.error.value = null
    auth.isAuthenticated.value = false
  })

  it('zeigt nur die vom Backend unterstützte Login-Methode', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })

    expect(wrapper.get('h1').text()).toBe('Willkommen zurück')
    expect(wrapper.get('input[type="email"]').attributes('autocomplete')).toBe('email')
    expect(wrapper.get('input[type="password"]').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.text()).not.toContain('GitHub')
    expect(wrapper.text()).not.toContain('Passwort vergessen')
  })

  it('validiert Login-Daten vor dem API-Aufruf', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })

    await wrapper.get('form').trigger('submit')

    expect(auth.login).not.toHaveBeenCalled()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(2)
  })

  it('sendet die Login-Daten an den Auth-Service', async () => {
    auth.login.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })

    await wrapper.get('input[type="email"]').setValue('student@example.ch')
    await wrapper.get('input[type="password"]').setValue('geheim123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(auth.login).toHaveBeenCalledWith({
      email: 'student@example.ch',
      password: 'geheim123',
    })
  })

  // it('registriert Name, E-Mail und Passwort nach Zustimmung', async () => {
  //   auth.register.mockResolvedValue(undefined)
  //   const wrapper = await mountSuspended(LoginPage, { route: '/login?mode=register' })

  //   expect(wrapper.get('h1').text()).toBe('Willkommen zurück')

  //   await wrapper.get('input[name="name"]').setValue('Ada Lovelace')
  //   await wrapper.get('input[type="email"]').setValue('ada@example.ch')
  //   await wrapper.get('input[type="password"]').setValue('sicheres-passwort')
  //   await wrapper.get('input[type="checkbox"]').setValue(true)
  //   await wrapper.get('form').trigger('submit')
  //   await flushPromises()

  //   expect(auth.register).toHaveBeenCalledWith({
  //     name: 'Ada Lovelace',
  //     email: 'ada@example.ch',
  //     password: 'sicheres-passwort',
  //   })
  // })

  it('wechselt innerhalb derselben Seite zwischen Login und Registrierung', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })

    expect(wrapper.get('a[href="/login?mode=register"]').text()).toContain('Jetzt registrieren')
    expect(wrapper.find('input[name="name"]').exists()).toBe(false)
  })

  describe('guestOnly-Verhalten', () => {
    it('versteckt das Login-Formular für authentifizierte User', async () => {
      auth.isAuthenticated.value = true
      const wrapper = await mountSuspended(LoginPage, { route: '/login' })

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('zeigt das Login-Formular für nicht-authentifizierte User', async () => {
      auth.isAuthenticated.value = false
      const wrapper = await mountSuspended(LoginPage, { route: '/login' })

      expect(wrapper.find('form').exists()).toBe(true)
    })
  })
})
