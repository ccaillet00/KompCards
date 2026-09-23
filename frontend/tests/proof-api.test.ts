import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
import { defineComponent } from 'vue'
import { $fetch } from 'ofetch'
import { useProofs } from '../composables/useProofs'

const auth = vi.hoisted(() => ({ isAuthenticated: { value: true } }))

vi.mock('ofetch', () => ({ $fetch: vi.fn() }))
vi.mock('../composables/useAuth', () => ({ useAuth: () => auth }))

const Harness = defineComponent({
  setup() {
    return useProofs()
  },
  template: '<div />',
})

describe('useProofs', () => {
  beforeEach(() => {
    clearNuxtState()
    vi.mocked($fetch).mockReset()
  })

  it('kombiniert Kompetenzkarten und Lehrplan über die vorhandenen GET-Endpunkte', async () => {
    vi.mocked($fetch)
      .mockResolvedValueOnce({
        proofs: [{
          id: 7,
          userId: 'user-1',
          competencyId: 11,
          copiedFromProofId: null,
          status: 5,
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-12T08:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce([{
        id: 1,
        code: 'RLP-INF',
        titel: 'Informatik HF',
        areas: [{
          id: 3,
          code: 'A1',
          titel: 'Datenbanken',
          competencies: [{ id: 11, code: 'A1.1', description: 'Datenmodelle entwickeln' }],
        }],
      }])

    const wrapper = await mountSuspended(Harness)
    await (wrapper.vm as unknown as { load: () => Promise<void> }).load()

    expect($fetch).toHaveBeenNthCalledWith(1, '/api/competency/proofs', {
      credentials: 'include',
    })
    expect($fetch).toHaveBeenNthCalledWith(2, '/api/curriculum', {
      credentials: 'include',
    })
    expect((wrapper.vm as unknown as { cards: Array<Record<string, unknown>> }).cards[0]).toMatchObject({
      id: 7,
      competencyCode: 'A1.1',
      competencyDescription: 'Datenmodelle entwickeln',
      areaTitle: 'Datenbanken',
      curriculumTitle: 'Informatik HF',
    })
  })

  it('sendet ohne Sitzung keine geschützte Anfrage', async () => {
    auth.isAuthenticated.value = false
    const wrapper = await mountSuspended(Harness)

    await (wrapper.vm as unknown as { load: () => Promise<void> }).load()

    expect($fetch).not.toHaveBeenCalled()
    expect((wrapper.vm as unknown as { error: string | null }).error).toContain('Sitzung')
    auth.isAuthenticated.value = true
  })
})
