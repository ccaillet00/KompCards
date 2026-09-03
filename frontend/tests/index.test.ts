import { describe, expect, it } from 'vitest'
import { renderPage } from '@nuxt/test-utils/runtime'

describe('Startseite (Rauchtest)', () => {
  it('zeigt den Titel', async () => {
    const { html } = await renderPage('/')
    expect(html).toContain('KompCards')
  })
})
