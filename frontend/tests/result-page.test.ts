import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ResultPage from '../pages/cards/[id]/result.vue'

const fixture = vi.hoisted(() => ({
  output: {
    id: 5,
    predecessor: null,
    competencyInputId: 4,
    workResult: 'Das Datenmodell wurde fachlich korrekt umgesetzt.',
    quality: 4 as const,
    qualityStatement: 'Die Dokumentation ist klar und nachvollziehbar.',
    llmModel: 'test-model',
    createdAt: '2026-09-20T08:00:00.000Z',
    overlapCurriculum: true,
    noteImprovment: 'Beschreibe die Validierung noch genauer.',
    isSaved: false,
    userFeedback: null,
  },
  proof: {
    id: 9,
    userId: 'user-1',
    competencyId: 11,
    copiedFromProofId: null,
    status: 4 as 1 | 2 | 3 | 4 | 5 | 6,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    inputs: [] as Array<Record<string, unknown>>,
  },
  context: {
    curriculum: { id: 1, code: 'RLP-INF', titel: 'Informatik HF', areas: [] },
    area: { id: 3, code: 'A1', titel: 'Datenbanken', competencies: [] },
    competency: { id: 11, code: 'A1.1', description: 'Datenmodelle entwickeln' },
  },
  loadProof: vi.fn(),
  retryOutput: vi.fn(),
  acceptOutput: vi.fn(),
  discardProof: vi.fn(),
}))

vi.mock('../composables/useCompetencyWorkflow', async () => {
  const { computed, ref } = await import('vue')
  return {
    useCompetencyWorkflow: () => ({
      proof: ref(fixture.proof),
      competencyContext: ref(fixture.context),
      isLoading: ref(false),
      isSaving: ref(false),
      isChecking: ref(false),
      error: ref(null),
      loadProof: fixture.loadProof,
      latestOutput: computed(() => fixture.output),
      retryOutput: fixture.retryOutput,
      acceptOutput: fixture.acceptOutput,
      discardProof: fixture.discardProof,
    }),
  }
})

describe('LLM-Auswertung', () => {
  beforeEach(() => {
    sessionStorage.setItem('kompcards.auth', JSON.stringify({
      token: 'jwt-token',
      expiresAt: Date.now() + 60_000,
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    }))
    fixture.proof.status = 4
    fixture.proof.inputs = [{
      id: 4,
      competencyProofId: 9,
      userRole: 'Entwickler',
      what: 'Datenmodell erstellt',
      how: 'Anforderungen analysiert',
      why: 'Für konsistente Daten',
      environment: 'Praxisprojekt',
      subject: null,
      createdAt: '2026-09-20T08:00:00.000Z',
      outputs: [fixture.output],
    }]
    fixture.loadProof.mockReset().mockResolvedValue(undefined)
    fixture.retryOutput.mockReset().mockResolvedValue({ ...fixture.output, id: 6, workResult: 'Neue Auswertung' })
    fixture.acceptOutput.mockReset().mockResolvedValue({ ...fixture.output, isSaved: true })
    fixture.discardProof.mockReset().mockResolvedValue(undefined)
  })

  it('zeigt Dokumentation und echten LLM-Output mit Qualitätsskala 1 bis 4', async () => {
    const wrapper = await mountSuspended(ResultPage, { route: '/cards/9/result' })
    await flushPromises()

    expect(fixture.loadProof).toHaveBeenCalledWith(9)
    expect(wrapper.get('h1').text()).toBe('Auswertung deiner Arbeit')
    expect(wrapper.text()).toContain('Datenmodell erstellt')
    expect(wrapper.text()).toContain('Das Datenmodell wurde fachlich korrekt umgesetzt.')
    expect(wrapper.get('[data-test="quality-score"]').text()).toContain('4 / 4')
    expect(wrapper.text()).toContain('Beschreibe die Validierung noch genauer.')
  })

  it('generiert mit echtem Benutzerfeedback eine neue Revision', async () => {
    const wrapper = await mountSuspended(ResultPage, { route: '/cards/9/result' })
    await flushPromises()

    await wrapper.get('[data-test="show-retry"]').trigger('click')
    await wrapper.get('#retry-feedback').setValue('Beschreibe den Praxisbezug genauer.')
    await wrapper.get('[data-test="retry-output"]').trigger('click')
    await flushPromises()

    expect(fixture.retryOutput).toHaveBeenCalledWith(5, 'Beschreibe den Praxisbezug genauer.')
    expect(wrapper.text()).toContain('Neue Auswertung')
  })

  it('akzeptiert oder verwirft die Auswertung erst über die jeweilige Aktion', async () => {
    const accepted = await mountSuspended(ResultPage, { route: '/cards/9/result' })
    await flushPromises()
    await accepted.get('[data-test="accept-output"]').trigger('click')
    await flushPromises()
    expect(fixture.acceptOutput).toHaveBeenCalledWith(5)
    expect(accepted.text()).toContain('Auswertung übernommen')

    fixture.proof.status = 4
    const discarded = await mountSuspended(ResultPage, { route: '/cards/9/result' })
    await flushPromises()
    const push = vi.spyOn(discarded.vm.$router, 'push')
    await discarded.get('[data-test="show-discard"]').trigger('click')
    await discarded.get('[data-test="confirm-discard"]').trigger('click')
    await flushPromises()
    expect(fixture.discardProof).toHaveBeenCalledWith(9)
    expect(push).toHaveBeenCalledWith('/cards')
  })
})
