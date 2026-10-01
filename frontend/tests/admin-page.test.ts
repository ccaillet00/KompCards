import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminPage from '../pages/admin.vue'

const admin = vi.hoisted(() => ({
  users: { value: [{ id: 'u-1', name: 'Ada', email: 'ada@example.ch', role: 'user', banned: false }] },
  total: { value: 1 },
  isLoading: { value: false },
  error: { value: null as string | null },
  load: vi.fn(),
  setRole: vi.fn(),
  setBanned: vi.fn(),
  revokeSessions: vi.fn(),
  setPassword: vi.fn(),
}))

vi.mock('../composables/useAdminUsers', () => ({ useAdminUsers: () => admin }))

describe('Admin-Seite', () => {
  beforeEach(() => {
    for (const value of Object.values(admin)) {
      if (typeof value === 'function' && 'mockReset' in value) value.mockReset()
    }
    admin.load.mockResolvedValue(undefined)
  })

  it('bietet nur die freigegebenen Verwaltungsaktionen an', async () => {
    const wrapper = await mountSuspended(AdminPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Benutzerverwaltung')
    expect(wrapper.text()).toContain('Ada')
    expect(wrapper.text()).toContain('Rolle')
    expect(wrapper.text()).toContain('Sitzungen widerrufen')
    expect(wrapper.text()).not.toContain('Löschen')
    expect(wrapper.text()).not.toContain('Impersonation')
  })

 it('speichert Rollen nur ausdrücklich und bestätigt Sperren', async () => {
  const wrapper = await mountSuspended(AdminPage)
  await wrapper.get('select').setValue('admin')
  expect(admin.setRole).not.toHaveBeenCalled()
  await wrapper.get('[data-test="save-role"]').trigger('click')
  await flushPromises()
  expect(admin.setRole).toHaveBeenCalledWith('u-1', 'admin')
  await wrapper.get('[data-test="toggle-ban"]').trigger('click')
  expect(admin.setBanned).not.toHaveBeenCalled()
  expect(wrapper.get('[data-test="admin-confirmation"]').text()).toContain('Ada')
  await wrapper.get('[data-test="confirm-admin-action"]').trigger('click')
  await flushPromises()
  expect(admin.setBanned).toHaveBeenCalledWith('u-1', true)
 })

})
