import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { useAdminUsers } from '../composables/useAdminUsers'

const admin = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setRole: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  revokeUserSessions: vi.fn(),
  setUserPassword: vi.fn(),
}))
const auth = vi.hoisted(() => ({ handleUnauthorized: vi.fn(() => false) }))

vi.mock('../lib/authClient', () => ({
  createRequestAuthClient: () => ({ admin }),
}))
vi.mock('../composables/useAuth', () => ({ useAuth: () => auth }))

const Harness = defineComponent({
  setup: useAdminUsers,
  template: '<div />',
})

describe('useAdminUsers', () => {
  beforeEach(() => {
    for (const mock of Object.values(admin)) mock.mockReset()
    auth.handleUnauthorized.mockReset()
    auth.handleUnauthorized.mockReturnValue(false)
  })

  it('lädt Benutzer über das Better-Auth-Admin-Plugin', async () => {
    admin.listUsers.mockResolvedValue({
      data: { users: [{ id: 'u-1', name: 'Ada', email: 'ada@example.ch', role: 'user', banned: false }], total: 1 },
      error: null,
    })
    const wrapper = await mountSuspended(Harness)

    await (wrapper.vm as unknown as { load: () => Promise<void> }).load()

    expect(admin.listUsers).toHaveBeenCalledWith({ query: { limit: 100, sortBy: 'name', sortDirection: 'asc' } })
    expect((wrapper.vm as unknown as { users: Array<{ id: string }> }).users[0]?.id).toBe('u-1')
  })

  it('widerruft nach administrativem Passwortsetzen alle Sitzungen des Benutzers', async () => {
    admin.setUserPassword.mockResolvedValue({ data: { status: true }, error: null })
    admin.revokeUserSessions.mockResolvedValue({ data: { success: true }, error: null })
    const wrapper = await mountSuspended(Harness)

    await (wrapper.vm as unknown as { setPassword: (id: string, password: string) => Promise<void> })
      .setPassword('u-1', 'neues-passwort')

    expect(admin.setUserPassword).toHaveBeenCalledWith({ userId: 'u-1', newPassword: 'neues-passwort' })
    expect(admin.revokeUserSessions).toHaveBeenCalledWith({ userId: 'u-1' })
  })

  it('stellt Rollen, Sperren und Sitzungswiderruf bereit', async () => {
    admin.setRole.mockResolvedValue({ data: { user: {} }, error: null })
    admin.banUser.mockResolvedValue({ data: { user: {} }, error: null })
    admin.unbanUser.mockResolvedValue({ data: { user: {} }, error: null })
    admin.revokeUserSessions.mockResolvedValue({ data: { success: true }, error: null })
    admin.listUsers.mockResolvedValue({ data: { users: [], total: 0 }, error: null })
    const wrapper = await mountSuspended(Harness)
    const api = wrapper.vm as unknown as {
      setRole: (id: string, role: 'admin' | 'user') => Promise<void>
      setBanned: (id: string, banned: boolean) => Promise<void>
      revokeSessions: (id: string) => Promise<void>
    }

    await api.setRole('u-1', 'admin')
    await api.setBanned('u-1', true)
    await api.setBanned('u-1', false)
    await api.revokeSessions('u-1')

    expect(admin.setRole).toHaveBeenCalledWith({ userId: 'u-1', role: 'admin' })
    expect(admin.banUser).toHaveBeenCalledWith({ userId: 'u-1', banReason: 'Durch KompCards-Administration gesperrt' })
    expect(admin.unbanUser).toHaveBeenCalledWith({ userId: 'u-1' })
    expect(admin.revokeUserSessions).toHaveBeenCalledWith({ userId: 'u-1' })
  })

  it('leitet 401-Antworten an die zentrale Sitzungsbehandlung weiter', async () => {
    const unauthorized = { message: 'Unauthorized', status: 401 }
    admin.listUsers.mockResolvedValue({ data: null, error: unauthorized })
    auth.handleUnauthorized.mockReturnValue(true)
    const wrapper = await mountSuspended(Harness)

    await expect((wrapper.vm as unknown as { load: () => Promise<void> }).load()).rejects.toThrow()

    expect(auth.handleUnauthorized).toHaveBeenCalledWith(unauthorized)
  })

 it('lädt weitere Benutzer mit einem Offset', async () => {
  admin.listUsers.mockResolvedValue({data:{users:[],total:150},error:null})
  const wrapper = await mountSuspended(Harness)
  await (wrapper.vm as unknown as {load:(page?:number)=>Promise<void>}).load(2)
  expect(admin.listUsers).toHaveBeenCalledWith({query:{limit:100,offset:100,sortBy:'name',sortDirection:'asc'}})
 })

})
