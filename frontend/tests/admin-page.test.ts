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
})
