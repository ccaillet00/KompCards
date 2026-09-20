import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DashboardPage from '../pages/dashboard.vue'
import CardsPage from '../pages/cards/index.vue'

const fixture = vi.hoisted(() => ({
  cards: [
    {
      id: 3,
      competencyId: 12,
      status: 1 as const,
      createdAt: '2026-09-10T08:00:00.000Z',
      updatedAt: '2026-09-18T08:00:00.000Z',
      competencyCode: 'B1.2',
      competencyDescription: 'Anforderungen analysieren',
      areaCode: 'B1',
      areaTitle: 'Analyse & Design',
      curriculumTitle: 'Informatik HF',
    },
    {
      id: 2,
      competencyId: 11,
      status: 5 as const,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
      competencyCode: 'A1.1',
      competencyDescription: 'Datenmodelle entwickeln',
      areaCode: 'A1',
      areaTitle: 'Datenbanken',
      curriculumTitle: 'Informatik HF',
    },
  ],
  load: vi.fn(),
}))

vi.mock('../composables/useProofs', async () => {
  const { ref } = await import('vue')
  return {
    useProofs: () => ({
      cards: ref(fixture.cards),
      isLoading: ref(false),
      error: ref(null),
      load: fixture.load,
    }),
  }
})

describe('Dashboard und Meine Karten', () => {
  beforeEach(() => fixture.load.mockReset())

  it('zeigt den aus echten Karten berechneten Fortschritt und die letzte Karte', async () => {
    const wrapper = await mountSuspended(DashboardPage)
    await flushPromises()

    expect(fixture.load).toHaveBeenCalledOnce()
    expect(wrapper.get('h1').text()).toBe('Dein Fortschritt zählt.')
    expect(wrapper.get('[data-test="created-count"]').text()).toContain('2')
    expect(wrapper.get('[data-test="completed-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="latest-card"]').text()).toContain('B1.2')
    expect(wrapper.html()).toContain('/images/fox-world/dashboard.webp')
  })

  it('listet Karten mit fachlichen Statusbezeichnungen und Statusfiltern', async () => {
    const wrapper = await mountSuspended(CardsPage)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Meine Karten')
    expect(wrapper.findAll('[data-test="proof-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Anforderungen analysieren')
    expect(wrapper.text()).toContain('Entwurf')
    expect(wrapper.text()).toContain('Abgeschlossen')
    expect(wrapper.findAll('[data-test="proof-row"]')[0]?.attributes('href')).toBe('/cards/3')
    expect(wrapper.findAll('[data-test="proof-row"]')[1]?.attributes('href')).toBe('/cards/2/result')

    await wrapper.get('[data-test="status-filter-5"]').trigger('click')
    expect(wrapper.findAll('[data-test="proof-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="proof-row"]').text()).toContain('A1.1')
  })
})
