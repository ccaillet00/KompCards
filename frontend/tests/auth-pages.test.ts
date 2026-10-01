import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AuthLayout from '../layouts/auth.vue'
import LoginPage from '../pages/login.vue'
import AuthRegisterForm from '../components/auth/AuthRegisterForm.vue'

const auth = vi.hoisted(() => ({
  githubEnabled: { value: false },
  loadAuthMethods: vi.fn(),
  signInWithGithub: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  isLoading: { value: false },
  error: { value: null as string | null },
  isAuthenticated: { value: false },
  restoreSession: vi.fn(),
}))

vi.mock('../composables/useAuth', () => ({
  useAuth: () => auth,
}))

describe('Authentifizierungsseiten', () => {
  beforeEach(() => {
    auth.githubEnabled.value = false
    auth.loadAuthMethods.mockReset().mockResolvedValue(undefined)
    auth.signInWithGithub.mockReset().mockResolvedValue(undefined)
    auth.isLoading.value = false
    auth.login.mockReset()
    auth.register.mockReset()
    auth.error.value = null
    auth.isAuthenticated.value = false
    auth.restoreSession.mockReset().mockResolvedValue(undefined)
  })

  it('integriert die Fuchswelt unbeschnitten und mit einem weichen Uebergang', async () => {
    const wrapper = await mountSuspended(AuthLayout)
    const image = wrapper.get('[data-test="auth-artwork"] img')

    expect(image.classes()).toContain('auth-artwork-image')
    expect(image.classes()).toContain('object-contain')
    expect(image.classes()).not.toContain('object-cover')
    expect(wrapper.find('.auth-artwork-blend').exists()).toBe(true)
  })

  it('zeigt nur die vom Backend unterstützte Login-Methode', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })

    expect(wrapper.get('h1').text()).toBe('Willkommen zurück')
    expect(wrapper.get('input[type="email"]').attributes('autocomplete')).toBe('email')
    expect(wrapper.get('input[type="password"]').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.text()).not.toContain('GitHub')
    expect(wrapper.text()).not.toContain('Passwort vergessen')
  })

  it('bietet aktiviertes GitHub für bereits registrierte GitHub-Konten an', async () => {
    auth.githubEnabled.value = true
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })
    await wrapper.get('[data-test="github-auth"]').trigger('click')
    expect(auth.loadAuthMethods).toHaveBeenCalled()
    expect(auth.signInWithGithub).toHaveBeenCalledWith('login')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('registriert über GitHub ohne Passwort erst nach Zustimmung', async () => {
    auth.githubEnabled.value = true
    const wrapper = await mountSuspended(AuthRegisterForm)
    expect(wrapper.get('[data-test="github-auth"]').attributes('disabled')).toBeDefined()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.get('[data-test="github-auth"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-test="github-auth"]').trigger('click')
    expect(auth.signInWithGithub).toHaveBeenCalledWith('register')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('zeigt OAuth-Konflikte verständlich statt rohe Providerbeschreibungen an', async () => {
    const wrapper = await mountSuspended(LoginPage, { route: '/login?error=account_not_linked&error_description=UNTRUSTED' })
    expect(wrapper.get('[data-test="oauth-error"]').text()).toContain('E-Mail-Adresse')
    expect(wrapper.get('[data-test="oauth-error"]').text()).toContain('Passwort')
    expect(wrapper.text()).not.toContain('UNTRUSTED')
  })

  it('fängt einen fehlgeschlagenen GitHub-Start im Formular ab', async () => {
    auth.githubEnabled.value = true
    auth.signInWithGithub.mockRejectedValue(new Error('offline'))
    auth.error.value = 'GitHub ist gerade nicht erreichbar.'
    const wrapper = await mountSuspended(LoginPage, { route: '/login' })
    await wrapper.get('[data-test="github-auth"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('GitHub ist gerade nicht erreichbar.')
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
    it('zeigt authentifizierten Usern vor der Weiterleitung einen Ladebildschirm', async () => {
      auth.isAuthenticated.value = true
      const wrapper = await mountSuspended(LoginPage, { route: '/login' })
      await flushPromises()

      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.get('[role="status"]').text()).toContain('Willkommen zurück')
      expect(wrapper.get('[role="status"]').text()).toContain('Dashboard wird vorbereitet')
    })

    it('zeigt das Login-Formular für nicht-authentifizierte User', async () => {
      auth.isAuthenticated.value = false
      const wrapper = await mountSuspended(LoginPage, { route: '/login' })
      await flushPromises()

      expect(wrapper.find('form').exists()).toBe(true)
    })
  })

 it('verknüpft Registrierungsfehler mit den Eingabefeldern', async () => {
  const wrapper = await mountSuspended(AuthRegisterForm)
  await wrapper.get('form').trigger('submit')
  expect(wrapper.get('#register-name').attributes('aria-describedby')).toContain('register-name-error')
  expect(wrapper.get('#register-email').attributes('aria-describedby')).toContain('register-email-error')
  expect(wrapper.get('input[type="checkbox"]').attributes('aria-describedby')).toContain('register-terms-error')
 })

})
