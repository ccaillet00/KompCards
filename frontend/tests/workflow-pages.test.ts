import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SelectCompetencyPage from '../pages/cards/new.vue'
import DocumentationPage from '../pages/cards/[id]/index.vue'

const fixture = vi.hoisted(() => ({
  saving: false,
  curricula: [{
    id: 1,
    code: 'RLP-INF',
    titel: 'Informatik HF',
    areas: [{
      id: 3,
      code: 'A1',
      titel: 'Datenbanken',
      competencies: [{ id: 11, code: 'A1.1', description: 'Datenmodelle entwickeln' }],
    }],
  }],
  proof: {
    id: 9,
    userId: 'user-1',
    competencyId: 11,
    copiedFromProofId: null,
    status: 1 as const,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
    inputs: [{
      id: 4,
      competencyProofId: 9,
      userRole: 'Entwickler',
      what: 'Datenmodell erstellt',
      how: 'Anforderungen analysiert',
      why: 'Für konsistente Daten',
      environment: 'Praxisprojekt',
      subject: null,
      createdAt: '2026-09-12T08:00:00.000Z',
      outputs: [],
    }],
  },
  loadCurricula: vi.fn(),
  createProof: vi.fn(),
  loadProof: vi.fn(),
  saveInput: vi.fn(),
  triggerLlmCheck: vi.fn(),
}))

vi.mock('../composables/useCompetencyWorkflow', async () => {
  const { ref } = await import('vue')
  return {
    useCompetencyWorkflow: () => ({
      curricula: ref(fixture.curricula),
      proof: ref(fixture.proof),
      isLoading: ref(false),
      isSaving: ref(fixture.saving),
      isChecking: ref(false),
      error: ref(null),
      loadCurricula: fixture.loadCurricula,
      createProof: fixture.createProof,
      loadProof: fixture.loadProof,
      saveInput: fixture.saveInput,
      triggerLlmCheck: fixture.triggerLlmCheck,
    }),
  }
})

describe('Kompetenzauswahl und Dokumentation', () => {
  beforeEach(() => {
    fixture.saving = false
    sessionStorage.setItem('kompcards.auth', JSON.stringify({
      token: 'jwt-token',
      expiresAt: Date.now() + 60_000,
      user: { id: 'user-1', name: 'Ada', email: 'ada@example.ch' },
    }))
    fixture.loadCurricula.mockReset()
    fixture.createProof.mockReset().mockResolvedValue({ id: 9 })
    fixture.loadProof.mockReset().mockResolvedValue(undefined)
    fixture.saveInput.mockReset().mockResolvedValue(undefined)
    fixture.triggerLlmCheck.mockReset().mockResolvedValue({ id: 5 })
  })

  it('sperrt Eingaben während des Speicherns', async () => {
    fixture.saving = true
    const wrapper = await mountSuspended(DocumentationPage, { route: '/cards/9' })
    await flushPromises()
    expect(wrapper.get('#user-role').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(fixture.triggerLlmCheck).not.toHaveBeenCalled()
  })

  it('führt hierarchisch zur gewählten Kompetenz und erstellt die Karte', async () => {
    const wrapper = await mountSuspended(SelectCompetencyPage)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Kompetenzkarte erstellen')
    expect(wrapper.get('[data-test="page-artwork"] img').classes()).toContain('fox-world-page-image')
    await wrapper.get('#curriculum').setValue('1')
    await wrapper.get('#area').setValue('3')
    await wrapper.get('#competency').setValue('11')
    expect(wrapper.text()).toContain('Datenmodelle entwickeln')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(fixture.createProof).toHaveBeenCalledWith(11)
  })

  it('lädt die letzte Eingabe und speichert die Dokumentation', async () => {
    const wrapper = await mountSuspended(DocumentationPage, { route: '/cards/9' })
    await flushPromises()

    expect(fixture.loadProof).toHaveBeenCalledWith(9)
    expect(wrapper.get('h1').text()).toBe('Arbeit dokumentieren')
    expect(wrapper.get('[data-test="page-artwork"] img').classes()).toContain('fox-world-page-image')
    expect((wrapper.get('#user-role').element as HTMLTextAreaElement).value).toBe('Entwickler')

    await wrapper.get('[data-test="save-draft"]').trigger('click')
    await flushPromises()
    expect(fixture.saveInput).toHaveBeenCalledWith(9, {
      userRole: 'Entwickler',
      what: 'Datenmodell erstellt',
      how: 'Anforderungen analysiert',
      why: 'Für konsistente Daten',
      environment: 'Praxisprojekt',
    })
  })

  it('übergibt eine vollständig gespeicherte Dokumentation an die LLM-Prüfung', async () => {
    const wrapper = await mountSuspended(DocumentationPage, { route: '/cards/9' })
    await flushPromises()
    const push = vi.spyOn(wrapper.vm.$router, 'push')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fixture.triggerLlmCheck).toHaveBeenCalledWith(9)
    expect(push).toHaveBeenCalledWith('/cards/9/result')
  })
})
