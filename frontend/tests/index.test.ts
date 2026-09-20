import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../pages/index.vue'

describe('Landing Page', () => {
  it('zeigt die KompCards-Einführung mit echten Links', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.get('h1').text()).toBe('Kompetenzen sichtbar machen.')
    expect(wrapper.text()).toContain('In wenigen Schritten zur Kompetenzkarte.')
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })

  it('verwendet das Fuchswelt-Asset, aber keine Mockup-Datei', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const html = wrapper.html()

    expect(html).toContain('/images/fox-world/landing-hero.webp')
    expect(html).not.toContain('docs/design/references')
  })

  it('beschreibt den Ablauf in vier Schritten', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const steps = wrapper.findAll('[data-test="process-step"]')

    expect(steps).toHaveLength(4)
    expect(steps.map(step => step.text())).toEqual(expect.arrayContaining([
      expect.stringContaining('Kompetenz auswählen'),
      expect.stringContaining('Arbeit dokumentieren'),
      expect.stringContaining('KI erstellt eine Auswertung'),
      expect.stringContaining('Kompetenzkarte abschliessen'),
    ]))
  })
})
