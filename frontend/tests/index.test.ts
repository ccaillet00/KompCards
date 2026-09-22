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

  it('zeigt die Fuchswelt im Hero als eigenstaendige, unbeschnittene Bildkomposition', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const artwork = wrapper.get('[data-test="hero-artwork"]')
    const image = artwork.get('img')

    expect(artwork.attributes('aria-hidden')).toBe('true')
    expect(image.classes()).toContain('hero-artwork-image')
    expect(image.classes()).toContain('object-contain')
    expect(image.classes()).not.toContain('object-cover')
  })

  it('integriert die Fuchswelt im Abschlussbereich als vollflaechiges Banner', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const artwork = wrapper.get('[data-test="cta-artwork"]')
    const image = artwork.get('img')

    expect(artwork.attributes('aria-hidden')).toBe('true')
    expect(image.classes()).toContain('object-cover')
    expect(image.classes()).toContain('size-full')
  })

  it('haelt die Hero-Ueberschrift auch auf breiten Bildschirmen kompakt', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const heading = wrapper.get('h1')

    expect(heading.classes()).toContain('xl:max-w-2xl')
    expect(heading.classes()).toContain('xl:text-6xl')
    expect(heading.get('span').classes()).toContain('block')
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
