import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../pages/index.vue'

describe('Startseite (Rauchtest)', () => {
  it('zeigt den Titel', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.html()).toContain('KompCards')
  })
})