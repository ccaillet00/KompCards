import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UiButton from '../components/ui/UiButton.vue'
import UiFormField from '../components/ui/UiFormField.vue'
import UiSurfaceCard from '../components/ui/UiSurfaceCard.vue'
import ProofStatusBadge from '../components/proof/ProofStatusBadge.vue'
import WorkflowSteps from '../components/workflow/WorkflowSteps.vue'
import ProofListRow from '../components/proof/ProofListRow.vue'
import PublicHeader from '../components/navigation/PublicHeader.vue'

describe('KompCards Designsystem', () => {
  it('lässt Logo und Login auf kleinen Bildschirmen umbrechen', async () => {
    const header = await mountSuspended(PublicHeader)
    expect(header.get('.page-shell').classes()).toContain('flex-wrap')
    expect(header.get('a[href$="/login"]').text()).toContain('Einloggen')
  })

  it('benennt die KI-Prüfung verständlich und markiert den aktuellen Schritt', async () => {
    const wrapper = await mountSuspended(WorkflowSteps, { props: { current: 3 } })
    expect(wrapper.text()).toContain('KI-Auswertung')
    expect(wrapper.get('[aria-current="step"]').attributes('aria-label')).toContain('3. Prüfung')
  })

  it('unterscheidet Karten derselben Kompetenz durch ihre Kartennummer', async () => {
    const wrapper = await mountSuspended(ProofListRow, { props: { card: {
      id: 17, status: 1, competencyCode: 'A1.1', competencyDescription: 'Daten modellieren',
      areaTitle: 'Datenbanken', areaCode: 'A1', curriculumTitle: 'Informatik HF',
      userId: 'demo', competencyId: 1, copiedFromProofId: null,
      createdAt: '2026-10-01', updatedAt: '2026-10-01',
    } } })
    expect(wrapper.text()).toContain('Karte 17')
  })

  it('verwendet in der Navigation das verbindliche Logo', async () => {
    const header = await mountSuspended(PublicHeader)

    expect(header.get('img').attributes('src')).toBe('/brand/kompcards-logo.svg')
    expect(header.get('nav').attributes('aria-label')).toBe('Hauptnavigation')
  })

  it('rendert Buttons als Link oder Button', async () => {
    const link = await mountSuspended(UiButton, {
      props: { to: '/login' },
      slots: { default: 'Einloggen' },
    })
    const button = await mountSuspended(UiButton, {
      props: { variant: 'secondary' },
      slots: { default: 'Speichern' },
    })

    expect(link.get('a').attributes('href')).toBe('/login')
    expect(link.get('a').classes()).toContain('btn-primary')
    expect(button.get('button').attributes('type')).toBe('button')
    expect(button.get('button').classes()).toContain('btn-outline')
    expect(button.get('button').classes()).toContain('hover:text-primary')
  })

  it('verknüpft Form Label, Hilfetext und Fehlermeldung', async () => {
    const wrapper = await mountSuspended(UiFormField, {
      props: {
        id: 'role',
        label: 'Rolle',
        hint: 'Welche Rolle hattest du?',
        error: 'Bitte ausfüllen',
      },
      slots: { default: '<input id="role" />' },
    })

    expect(wrapper.get('label').attributes('for')).toBe('role')
    expect(wrapper.get('[role="alert"]').text()).toBe('Bitte ausfüllen')
    expect(wrapper.text()).toContain('Welche Rolle hattest du?')
  })

  it('stellt Oberflächen und alle fachlichen Statuswerte dar', async () => {
    const card = await mountSuspended(UiSurfaceCard, {
      slots: { default: 'Karteninhalt' },
    })
    expect(card.get('section').classes()).toContain('bg-base-100')

    const labels = []
    for (const status of [1, 2, 3, 4, 5, 6] as const) {
      const badge = await mountSuspended(ProofStatusBadge, { props: { status } })
      labels.push(badge.text())
    }

    expect(labels).toEqual([
      'Entwurf',
      'In Prüfung',
      'Prüfung fehlgeschlagen',
      'Auswertung bereit',
      'Karte abgeschlossen',
      'Verworfen',
    ])
  })
})
