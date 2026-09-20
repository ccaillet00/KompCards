import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'
import { defineComponent } from 'vue'
import { $fetch } from 'ofetch'
import { useCompetencyWorkflow } from '../composables/useCompetencyWorkflow'

const auth = vi.hoisted(() => ({ token: { value: 'jwt-token' } }))

vi.mock('ofetch', () => ({ $fetch: vi.fn() }))
vi.mock('../composables/useAuth', () => ({ useAuth: () => auth }))

const Harness = defineComponent({
  setup() {
    return useCompetencyWorkflow()
  },
  template: '<div />',
})

describe('useCompetencyWorkflow', () => {
  beforeEach(() => {
    clearNuxtState()
    vi.mocked($fetch).mockReset()
  })

  it('lädt den Lehrplan und erstellt eine Karte mit der gewählten Kompetenz', async () => {
    vi.mocked($fetch)
      .mockResolvedValueOnce([{ id: 1, code: 'RLP', titel: 'Informatik HF', areas: [] }])
      .mockResolvedValueOnce({ proof: { id: 9, competencyId: 11, status: 1 } })
    const wrapper = await mountSuspended(Harness)
    const workflow = wrapper.vm as unknown as {
      loadCurricula: () => Promise<void>
      createProof: (competencyId: number) => Promise<{ id: number }>
    }

    await workflow.loadCurricula()
    const proof = await workflow.createProof(11)

    expect($fetch).toHaveBeenNthCalledWith(1, '/api/curriculum', {
      headers: { Authorization: 'Bearer jwt-token' },
    })
    expect($fetch).toHaveBeenNthCalledWith(2, '/api/competency/proofs', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-token' },
      body: { competencyId: 11 },
    })
    expect(proof.id).toBe(9)
  })

  it('lädt, speichert und prüft eine bestehende Kompetenzkarte', async () => {
    const proof = { id: 9, competencyId: 11, status: 1, inputs: [] }
    vi.mocked($fetch)
      .mockResolvedValueOnce({ proof })
      .mockResolvedValueOnce([{ id: 1, code: 'RLP', titel: 'Informatik HF', areas: [] }])
      .mockResolvedValueOnce({ input: { id: 4 } })
      .mockResolvedValueOnce({ output: { id: 5 }, failed: false })
    const wrapper = await mountSuspended(Harness)
    const workflow = wrapper.vm as unknown as {
      loadProof: (proofId: number) => Promise<void>
      saveInput: (proofId: number, input: Record<string, string>) => Promise<void>
      triggerLlmCheck: (proofId: number) => Promise<{ id: number } | null>
    }
    const input = {
      userRole: 'Entwickler',
      what: 'Datenmodell erstellt',
      how: 'Anforderungen analysiert',
      why: 'Für konsistente Daten',
      environment: 'Praxisprojekt',
    }

    await workflow.loadProof(9)
    await workflow.saveInput(9, input)
    const output = await workflow.triggerLlmCheck(9)

    expect($fetch).toHaveBeenNthCalledWith(1, '/api/competency/proofs/9', {
      headers: { Authorization: 'Bearer jwt-token' },
    })
    expect($fetch).toHaveBeenNthCalledWith(3, '/api/competency/proofs/9/input', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-token' },
      body: input,
    })
    expect($fetch).toHaveBeenNthCalledWith(4, '/api/competency/proofs/9/llm-check', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-token' },
    })
    expect(output).toMatchObject({ id: 5 })
  })
})
